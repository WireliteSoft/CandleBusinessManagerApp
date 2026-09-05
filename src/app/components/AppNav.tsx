import { type Tab } from '../config';

type Props = {
  activeTab: Tab;
  canAccessTab: (tab: Tab) => boolean;
  onTabClick: (tab: Tab) => void;
};

type NavItem = {
  tab: Tab;
  label: string;
  activeClass: string;
};

const NAV_ITEMS: NavItem[] = [
  { tab: 'account', label: 'Account', activeClass: 'text-sky-600 border-b-2 border-sky-600' },
  { tab: 'products', label: 'Products', activeClass: 'text-amber-600 border-b-2 border-amber-600' },
  { tab: 'supplies', label: 'Supplies', activeClass: 'text-blue-600 border-b-2 border-blue-600' },
  { tab: 'recipes', label: 'Recipes', activeClass: 'text-purple-600 border-b-2 border-purple-600' },
  { tab: 'calculators', label: 'Calculators', activeClass: 'text-orange-600 border-b-2 border-orange-600' },
  { tab: 'batches', label: 'Batch Logs', activeClass: 'text-indigo-600 border-b-2 border-indigo-600' },
  { tab: 'teams', label: 'Teams', activeClass: 'text-violet-600 border-b-2 border-violet-600' },
  { tab: 'storefront', label: 'Storefront', activeClass: 'text-pink-600 border-b-2 border-pink-600' },
];

export default function AppNav({ activeTab, canAccessTab, onTabClick }: Props) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1">
          {NAV_ITEMS.filter((item) => canAccessTab(item.tab)).map((item) => (
            <button
              key={item.tab}
              onClick={() => onTabClick(item.tab)}
              className={`main-tab-btn px-6 py-4 font-medium transition-colors relative ${
                activeTab === item.tab ? item.activeClass : 'text-gray-600 hover:text-sky-400 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
