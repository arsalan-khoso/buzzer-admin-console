import { NavGroup } from '../models/nav.model';

export const ICONS_PATH = 'assets/icons';

// Groups come from the task doc; items and icons from the Figma sidebar.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Match Management',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: 'ic_dashboard' },
      { label: 'Sports', route: '/sports', icon: 'ic_sports', pageTitle: 'Sport Management' },
      { label: 'Matches', route: '/matches', icon: 'ic_matches' },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { label: 'Verifications', route: '/verifications', icon: 'ic_verifications' },
      { label: 'Videos', route: '/videos', icon: 'ic_videos' },
      { label: 'Athlete Blog Requests', route: '/blog-requests', icon: 'ic_blog_requests' },
    ],
  },
  {
    label: 'Finance',
    items: [{ label: 'Referrals', route: '/referrals', icon: 'ic_referrals' }],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', route: '/users', icon: 'ic_users' },
      { label: 'Registrations', route: '/registrations', icon: 'ic_registrations' },
      { label: 'Reporting', route: '/reporting', icon: 'ic_reporting' },
      { label: 'Restricted Devices', route: '/restricted-devices', icon: 'ic_restricted_devices' },
      { label: 'Restricted Words', route: '/restricted-words', icon: 'ic_restricted_words' },
    ],
  },
];
