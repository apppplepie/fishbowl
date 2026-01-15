export enum Tab {
  PROFILE = 'PROFILE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  PERMISSIONS = 'PERMISSIONS',
  SECURITY = 'SECURITY',
}

export interface User {
  name: string;
  handle: string;
  role: string;
}

export interface Notification {
  user: string;
  action: string;
  context: string;
  time: string;
}

