import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def check_statuses():
    db = SessionLocal()
    try:
        statuses = db.query(models.ReferenceData).filter_by(reference_data_type="STATUS").all()
        print("Current statuses in DB:")
        for s in statuses:
            print(f"  ID: {s.id}, Label: {s.label}, Key: {s.key}")
        
        allowed_keys = ["status_active", "status_archived", "status_upcoming"]
        to_delete = [s for s in statuses if s.key not in allowed_keys]
        
        if to_delete:
            print("\nStatuses to be removed (if no SKUs use them):")
            for s in to_delete:
                # Check if any SKUs use this status
                usage = db.query(models.SkuMaster).filter_by(status_reference_id=s.id).count()
                print(f"  {s.label} ({s.key}) - Used by {usage} SKUs")
                
                # If usage > 0, we should probably reassign them first?
                # The user said "make indevelopment to Upcoming Launches"
                # "Discarted to Arvhived"
                
                target_key = None
                label_lower = s.label.toLowerCase() if hasattr(s.label, 'toLowerCase') else s.label.lower()
                key_lower = s.key.lower()
                
                if "active" in label_lower or "active" in key_lower:
                    target_key = "status_active"
                elif "discard" in label_lower or "discard" in key_lower or "discontinued" in label_lower or "archive" in label_lower:
                    target_key = "status_archived"
                elif "development" in label_lower or "development" in key_lower or "upcoming" in label_lower or "upcoming" in key_lower:
                    target_key = "status_upcoming"
                elif "draft" in label_lower:
                    target_key = "status_upcoming"
                
                if target_key and usage > 0:
                    target = db.query(models.ReferenceData).filter_by(reference_data_type="STATUS", key=target_key).first()
                    if target:
                        print(f"    Reassigning {usage} SKUs to {target.label}...")
                        db.query(models.SkuMaster).filter_by(status_reference_id=s.id).update({"status_reference_id": target.id})
            
            # Now delete the unused statuses
            print("\nDeleting unused statuses...")
            for s in to_delete:
                usage = db.query(models.SkuMaster).filter_by(status_reference_id=s.id).count()
                if usage == 0:
                    db.delete(s)
                    print(f"  Deleted: {s.label}")
                else:
                    print(f"  Cannot delete {s.label}, still used by {usage} SKUs (reassignment failed?)")
            
            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    check_statuses()
