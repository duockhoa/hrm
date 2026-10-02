const AUTH = {
  login: "/auth/login",
  refreshToken: "/auth/refresh-token",
  logout: "/auth/logout",
};

const USERS = {
  base: "/users",
  me: "/users/me",
  myPermissions: "/users/me/permissions",
  addUser: "/users",
  applications: (userId: string | number) => `/users/${userId}/applications`,
  uploadAvatar: "/users/me/avatar",
  changePassword: "/users/me/change-password",
};

const INTERNAL = {
  auth: "/api/auth",
};

const DEPARTMENT = {
  base: "/departments",
};

const COMPANY = {
  base: "/companies",
};

const ITEMS = {
  base: "/items",
  finishedProducts: "/items/finished-products",
  semiFinishedProducts: "/items/semi-finished-products",
  rawMaterials: "/items/raw-materials",
  equipment: (itemCode: string) =>
    `/items/${encodeURIComponent(itemCode)}/equipment`,
  equipmentDetail: (itemEquipmentId: string | number) =>
    `/items/equipment/${itemEquipmentId}`,
};

const REGISTRATION_NUMBERS = {
  base: "/registration-numbers",
};

const PRODUCTION_SPECIFICATIONS = {
  base: "/production-specifications",
};

const FEATURES = {
  base: "/features",
  byKey: (key: string) => `/features/key/${encodeURIComponent(key)}`,
  item: (itemCode: string) => `/features/items/${encodeURIComponent(itemCode)}`,
  itemConfig: (itemCode: string) =>
    `/features/items/${encodeURIComponent(itemCode)}/config`,
};

const PRODUCT_LINES = {
  base: "/product-lines",
  byCode: (code: string) => `/product-lines/code/${encodeURIComponent(code)}`,
};

const EQUIPMENT = {
  base: "/equipment",
  detail: (id: string | number) => `/equipment/${id}`,
  parameters: (id: string | number) => `/equipment/${id}/parameters`,
  parameterDetail: (parameterId: string | number) =>
    `/equipment/parameters/${parameterId}`,
};

const CLEANING_OBJECTS = {
  base: "/cleaning-objects",
  detail: (id: string | number) => `/cleaning-objects/${id}`,
  byQrCode: (qrCode: string) =>
    `/cleaning-objects/qr/${encodeURIComponent(qrCode)}`,
};

const CLEANING_REQUIREMENTS = {
  base: "/cleaning-requirements",
  detail: (id: string | number) => `/cleaning-requirements/${id}`,
};

const DOSAGE_FORMS = {
  base: "/dosage-forms",
  detail: (id: string | number) => `/dosage-forms/${id}`,
};

export const API_ROUTES = {
  warehouseTemperatureHumidityChecks: {
    base: "/warehouse-temperature-humidity-checks",
    detail: (id: number) => `/warehouse-temperature-humidity-checks/${id}`,
  },
  auth: AUTH,
  users: USERS,
  internal: INTERNAL,
  departments: DEPARTMENT,
  companies: COMPANY,
  items: ITEMS,
  productionSpecifications: PRODUCTION_SPECIFICATIONS,
  features: FEATURES,
  productLines: PRODUCT_LINES,
  registrationNumbers: REGISTRATION_NUMBERS,
  equipment: EQUIPMENT,
  cleaningObjects: CLEANING_OBJECTS,
  cleaningRequirements: CLEANING_REQUIREMENTS,
  dosageForms: DOSAGE_FORMS,
};
