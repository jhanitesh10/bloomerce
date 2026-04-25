/**
 * Central configuration for application routing and resource naming.
 * Change these values to update paths globally (e.g. from '/skus' to '/products').
 */
export const APP_PATHS = {
  CATALOG: '/skus',
  INVENTORY: '/inventory',
  SALES: '/sales',
};

export const CATALOG_RESOURCES = {
  NAME: 'skus', // Used in nested paths like /skus/new or /skus/:id
};
