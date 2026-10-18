export interface NavItem {
  label: string;
  route: string;
  icon: string;
  /** Page heading when it differs from the sidebar label. */
  pageTitle?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
