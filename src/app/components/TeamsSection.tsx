import AccountAccess from '../../components/AccountAccess';
import EmployeeCommission from '../../components/EmployeeCommission';
import TeamContactMessages from '../../components/TeamContactMessages';
import TeamRolesAdmin from '../../components/TeamRolesAdmin';
import StorefrontOrdersPanel from '../../components/storefrontBuilder/StorefrontOrdersPanel';
import GiftCardManager from '../../components/storefrontBuilder/GiftCardManager';
import ReviewModerationPanel from '../../components/storefrontBuilder/ReviewModerationPanel';
import RewardManager from '../../components/storefrontBuilder/RewardManager';
import type { AuthUser } from '../../lib/localDb';
import type { TeamsTab } from '../config';

const TEAM_TAB_HELP: Record<TeamsTab, { title: string; description: string; sections: string[] }> = {
  access: {
    title: 'Access help',
    description: 'Invite people to the business account and control who can access the team workspace.',
    sections: ['Team access requests and invitations.', 'Join codes and account access controls.'],
  },
  employees: {
    title: 'Employees help',
    description: 'Manage employee records, work status, and commission information for your team.',
    sections: ['Employee profiles and active status.', 'Commission rates and earnings tracking.'],
  },
  roles: {
    title: 'Admin roles help',
    description: 'Create roles and set exactly which parts of Candle Business Manager each role can access or edit.',
    sections: ['Role names and staff assignments.', 'View and edit permissions for business tools.'],
  },
  contacts: {
    title: 'Contacts help',
    description: 'Review customer contact messages and move each request through your response workflow.',
    sections: ['Customer messages and status tracking.', 'Spam review, IP bans, and follow-up notes.'],
  },
  orders: {
    title: 'Orders help',
    description: 'Track storefront orders from payment through production, pickup, shipment, cancellation, or completion.',
    sections: ['Order details, items, and payment status.', 'Production, pickup, shipping, and cancellation updates.'],
  },
  giftCards: {
    title: 'Gift cards help',
    description: 'Find gift cards, review their balances and usage, and issue manual balance adjustments when needed.',
    sections: ['Gift card balances and redemption history.', 'Staff adjustments and customer notifications.'],
  },
  reviews: {
    title: 'Reviews help',
    description: 'Moderate storefront customer reviews before they appear publicly on your storefront.',
    sections: ['Approve, hide, or remove submitted reviews.', 'Review ratings and customer feedback.'],
  },
  rewards: {
    title: 'Rewards help',
    description: 'Manage customer reward balances, promotional credits, free gifts, and account giveaway entries.',
    sections: ['Customer reward and credit balances.', 'Reward history and staff-issued adjustments.'],
  },
};

type Props = {
  canAccessFeature: (featureKey: string) => boolean;
  canEditFeature: (featureKey: string) => boolean;
  me: AuthUser;
  renderReadOnlyNotice: () => React.JSX.Element;
  setTeamsTab: (tab: TeamsTab) => void;
  teamsTab: TeamsTab;
};

export default function TeamsSection({
  canAccessFeature,
  canEditFeature,
  me,
  renderReadOnlyNotice,
  setTeamsTab,
  teamsTab,
}: Props) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {canAccessFeature('teams_access') && (
          <button
            type="button"
            onClick={() => setTeamsTab('access')}
            className={`px-4 py-2 rounded-lg border ${
              teamsTab === 'access' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Access
          </button>
        )}
        {canAccessFeature('teams_employees') && (
          <button
            type="button"
            onClick={() => setTeamsTab('employees')}
            className={`px-4 py-2 rounded-lg border ${
              teamsTab === 'employees' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Employees
          </button>
        )}
        {(me.role === 'owner' || me.role === 'admin') && canAccessFeature('teams_roles') && (
          <button
            type="button"
            onClick={() => setTeamsTab('roles')}
            className={`px-4 py-2 rounded-lg border ${
              teamsTab === 'roles' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Admin Roles
          </button>
        )}
        {canAccessFeature('teams_contacts') && (
          <button
            type="button"
            onClick={() => setTeamsTab('contacts')}
            className={`px-4 py-2 rounded-lg border ${
              teamsTab === 'contacts' ? 'bg-cyan-600 text-white border-cyan-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Contacts
          </button>
        )}
        {canAccessFeature('storefront_edit') && (
          <button type="button" onClick={() => setTeamsTab('orders')} className={`px-4 py-2 rounded-lg border ${teamsTab === 'orders' ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            Orders
          </button>
        )}
        {canAccessFeature('storefront_edit') && (
          <button type="button" onClick={() => setTeamsTab('giftCards')} className={`px-4 py-2 rounded-lg border ${teamsTab === 'giftCards' ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Gift Cards</button>
        )}
        {canAccessFeature('storefront_edit') && <button type="button" onClick={() => setTeamsTab('reviews')} className={`px-4 py-2 rounded-lg border ${teamsTab === 'reviews' ? 'bg-yellow-500 text-slate-900 border-yellow-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Reviews</button>}
        {canAccessFeature('storefront_edit') && <button type="button" onClick={() => setTeamsTab('rewards')} className={`px-4 py-2 rounded-lg border ${teamsTab === 'rewards' ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Rewards</button>}
      </div>
      <section className="mb-6 rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-slate-700">
        <h3 className="font-bold text-slate-900">{TEAM_TAB_HELP[teamsTab].title}</h3>
        <p className="mt-1">{TEAM_TAB_HELP[teamsTab].description}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {TEAM_TAB_HELP[teamsTab].sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>
      {teamsTab === 'access' && canAccessFeature('teams_access') && (
        <>
          {!canEditFeature('teams_access') && renderReadOnlyNotice()}
          <AccountAccess me={me} readOnly={!canEditFeature('teams_access')} />
        </>
      )}
      {teamsTab === 'employees' && canAccessFeature('teams_employees') && (
        <>
          {!canEditFeature('teams_employees') && renderReadOnlyNotice()}
          <EmployeeCommission readOnly={!canEditFeature('teams_employees')} />
        </>
      )}
      {teamsTab === 'roles' && (me.role === 'owner' || me.role === 'admin') && (
        <>
          {!canEditFeature('teams_roles') && renderReadOnlyNotice()}
          <TeamRolesAdmin readOnly={!canEditFeature('teams_roles')} />
        </>
      )}
      {teamsTab === 'contacts' && canAccessFeature('teams_contacts') && (
        <>
          {!canEditFeature('teams_contacts') && renderReadOnlyNotice()}
          <TeamContactMessages readOnly={!canEditFeature('teams_contacts')} />
        </>
      )}
      {teamsTab === 'orders' && canAccessFeature('storefront_edit') && (
        <>
          {!canEditFeature('storefront_edit') && renderReadOnlyNotice()}
          <StorefrontOrdersPanel readOnly={!canEditFeature('storefront_edit')} />
        </>
      )}
      {teamsTab === 'giftCards' && canAccessFeature('storefront_edit') && <GiftCardManager readOnly={!canEditFeature('storefront_edit')} />}
      {teamsTab === 'reviews' && canAccessFeature('storefront_edit') && <ReviewModerationPanel readOnly={!canEditFeature('storefront_edit')} />}
      {teamsTab === 'rewards' && canAccessFeature('storefront_edit') && <RewardManager readOnly={!canEditFeature('storefront_edit')} />}
    </div>
  );
}
