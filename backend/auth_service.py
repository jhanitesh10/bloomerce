import os
import requests
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from supabase import create_client, Client
import models
import schemas

logger = logging.getLogger("auth_service")

class AuthResponse:
    def __init__(self, success: bool, user_data: Optional[Dict] = None, token_data: Optional[Dict] = None, error: Optional[str] = None):
        self.success = success
        self.user_data = user_data
        self.token_data = token_data
        self.error = error

class BaseAuthAdapter(ABC):
    @abstractmethod
    async def login(self, login_data: schemas.LoginRequest) -> AuthResponse:
        pass

    @abstractmethod
    async def signup(self, register_data: schemas.RegisterRequest) -> AuthResponse:
        pass

    @abstractmethod
    async def exchange_code_for_tokens(self, code: str) -> AuthResponse:
        pass

    def get_google_authorize_url(self) -> str:
        pass

    @abstractmethod
    async def get_user_profile(self, access_token: str) -> Optional[Dict]:
        pass

class SupabaseAdapter(BaseAuthAdapter):
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SECRET_KEY")
        if self.url and self.key:
            self.supabase: Client = create_client(self.url, self.key)

    async def login(self, login_data: schemas.LoginRequest) -> AuthResponse:
        try:
            print(f"!!! ATTEMPTING SUPABASE LOGIN FOR: {login_data.email}")
            res = self.supabase.auth.sign_in_with_password({
                "email": login_data.email,
                "password": login_data.password
            })
            user = res.user
            print(f"!!! SUPABASE LOGIN SUCCESS: {user.id}")
            token_data = {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "expires_in": res.session.expires_in
            }
            normalized_user = {
                "id": user.id,
                "email": user.email,
                "name": user.user_metadata.get("name") or f"{user.user_metadata.get('first_name', '')} {user.user_metadata.get('last_name', '')}".strip() or user.email,
            }
            return AuthResponse(success=True, user_data=normalized_user, token_data=token_data)
        except Exception as e:
            return AuthResponse(success=False, error=str(e))

    async def signup(self, register_data: schemas.RegisterRequest) -> AuthResponse:
        try:
            print(f"!!! ATTEMPTING SUPABASE SIGNUP FOR: {register_data.email}")
            res = self.supabase.auth.sign_up({
                "email": register_data.email,
                "password": register_data.password,
                "options": {
                    "data": {
                        "first_name": register_data.first_name,
                        "last_name": register_data.last_name
                    }
                }
            })
            user = res.user
            if not user:
                 return AuthResponse(success=True, error="Verification email sent. Please confirm your email to activate your account.")

            print(f"!!! SUPABASE SIGNUP SUCCESS: {user.id}")
            normalized_user = {
                "id": user.id,
                "email": user.email,
                "name": f"{register_data.first_name} {register_data.last_name}".strip(),
            }
            return AuthResponse(success=True, user_data=normalized_user)
        except Exception as e:
            return AuthResponse(success=False, error=str(e))

    def get_google_authorize_url(self) -> str:
        callback_url = os.getenv("AUTH_CALLBACK_URL")
        res = self.supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirectTo": callback_url
            }
        })
        return res.url

    async def exchange_code_for_tokens(self, code: str) -> AuthResponse:
        # Supabase PKCE flow usually handles this via the session in the client,
        # but for server-side code exchange:
        try:
            res = self.supabase.auth.exchange_code_for_session({"auth_code": code})
            user = res.user
            token_data = {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token
            }
            normalized_user = {
                "id": user.id,
                "email": user.email,
                "name": user.user_metadata.get("full_name") or user.user_metadata.get("name") or user.email,
            }
            return AuthResponse(success=True, user_data=normalized_user, token_data=token_data)
        except Exception as e:
            return AuthResponse(success=False, error=str(e))

    async def get_user_profile(self, access_token: str) -> Optional[Dict]:
        # Supabase doesn't need a separate profile fetch if we have the session
        return None

# Factory to get the active adapter
def get_auth_adapter() -> BaseAuthAdapter:
    return SupabaseAdapter()

async def authenticate_and_sync_user(login_data: schemas.LoginRequest, db: Session) -> AuthResponse:
    """
    The main entry point for the router.
    1. Authenticates with Supabase.
    2. Syncs the user to the local database.
    3. Returns the clean response.
    """
    adapter = get_auth_adapter()
    auth_res = await adapter.login(login_data)

    if not auth_res.success or not auth_res.user_data:
        return auth_res

    # Local Sync Logic
    user_info = auth_res.user_data
    provider_id = user_info.get("id")
    email = user_info.get("email")
    full_name = user_info.get("name")

    # Try to find user by provider_id first, then fallback to email
    db_user = db.query(models.User).filter(models.User.provider_id == provider_id).first()
    if not db_user:
        db_user = db.query(models.User).filter(models.User.email == email).first()

    if db_user:
        db_user.provider_id = provider_id # Ensure it's linked
        db_user.email = email
        if full_name:
            db_user.name = full_name
    else:
        db_user = models.User(
            id=provider_id,
            provider_id=provider_id,
            email=email,
            name=full_name,
            is_active=True
        )
        db.add(db_user)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Local user sync failed: {e}")

    return auth_res

async def register_and_sync_user(register_data: schemas.RegisterRequest, db: Session) -> AuthResponse:
    """
    1. Creates user in Supabase.
    2. Syncs to local DB.
    """
    adapter = get_auth_adapter()
    auth_res = await adapter.signup(register_data)

    if not auth_res.success:
        logger.error(f"Supabase signup failed: {auth_res.error}")
        return auth_res

    # If user is None (e.g. verification required), we return early
    if not auth_res.user_data:
        logger.info("Registration initiated but user data not yet available (likely awaiting email verification).")
        return auth_res

    user_info = auth_res.user_data
    provider_id = user_info.get("id")
    email = user_info.get("email")
    full_name = user_info.get("name")

    if not email:
        logger.warning(f"Supabase returned user without email (ID: {provider_id}). Syncing might be incomplete.")
        # We still want to try to sync by provider_id if possible
        db_user = db.query(models.User).filter(models.User.provider_id == provider_id).first()
    else:
        logger.info(f"Syncing user to local DB: {email} (ID: {provider_id})")
        db_user = db.query(models.User).filter(models.User.provider_id == provider_id).first()
        if not db_user:
            db_user = db.query(models.User).filter(models.User.email == email).first()

    if db_user:
        logger.info(f"User found in local DB, updating record.")
        db_user.provider_id = provider_id
        if email: db_user.email = email
        if full_name: db_user.name = full_name
    else:
        if not email:
            logger.error("Cannot create new local user without an email address.")
            return auth_res
            
        logger.info(f"Creating new local user record for {email}")
        db_user = models.User(
            id=provider_id,
            provider_id=provider_id,
            email=email,
            name=full_name,
            is_active=True
        )
        db.add(db_user)

    try:
        db.commit()
        logger.info("Local DB commit successful.")
    except Exception as e:
        db.rollback()
        logger.error(f"Local user sync failed during commit: {e}")

    return auth_res

async def handle_callback_and_sync(code: str, db: Session) -> AuthResponse:
    adapter = get_auth_adapter()
    auth_res = await adapter.exchange_code_for_tokens(code)

    if not auth_res.success or not auth_res.user_data:
        return auth_res

    # Sync Logic
    user_info = auth_res.user_data
    provider_id = user_info.get("id")
    email = user_info.get("email")
    full_name = user_info.get("name")

    db_user = db.query(models.User).filter(models.User.provider_id == provider_id).first()
    if not db_user:
        db_user = db.query(models.User).filter(models.User.email == email).first()

    if not db_user:
        db_user = models.User(
            id=provider_id, # Use provider_id as primary key
            provider_id=provider_id,
            email=email,
            name=full_name,
            is_active=True
        )
        db.add(db_user)
    else:
        db_user.provider_id = provider_id
        db_user.email = email
        if full_name:
            db_user.name = full_name

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Callback sync failed: {e}")

    return auth_res
