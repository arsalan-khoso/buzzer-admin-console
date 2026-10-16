import { NavGroup } from '../models/nav.model';

export const ICONS_PATH = 'assets/icons';

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Match Management',
    items: [
      { label: 'Sport Management', route: '/sports', icon: 'ic_sports' },
      { label: 'Matches', route: '/matches', icon: 'ic_match' },
      { label: 'Competitions', route: '/competitions', icon: 'ic_trophy' },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { label: 'Content', route: '/content', icon: 'ic_publish' },
      { label: 'Notifications', route: '/notifications', icon: 'ic_bell' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payouts', route: '/payouts', icon: 'ic_wallet' },
      { label: 'Transactions', route: '/transactions', icon: 'ic_receipt' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', route: '/users', icon: 'ic_users' },
      { label: 'Settings', route: '/settings', icon: 'ic_settings' },
    ],
  },
];
