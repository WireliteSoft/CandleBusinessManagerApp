import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, ShieldCheck } from 'lucide-react';
import { localDb, type TeamRoleRecord } from '../lib/localDb';

const FEATURE_LABELS: Array<{ key: string; label: string; editKey?: string }> = [
  { key: 'products', label: 'Products tab', editKey: 'products_edit' },
  { key: 'supplies', label: 'Supplies tab', editKey: 'supplies_edit' },
  { key: 'recipes', label: 'Recipes tab', editKey: 'recipes_edit' },
  { key: 'calculators', label: 'Calculators tab', editKey: 'calculators_edit' },
  { key: 'batches', label: 'Batch Log tab', editKey: 'batches_edit' },
  { key: 'storefront', label: 'Storefront tab', editKey: 'storefront_edit' },
  { key: 'teams', label: 'Teams tab' },
  { key: 'teams_access', label: 'Teams > Access', editKey: 'teams_access_edit' },
  { key: 'teams_employees', label: 'Teams > Employees', editKey: 'teams_employees_edit' },
  { key: 'teams_roles', label: 'Teams > Admin Roles', editKey: 'teams_roles_edit' },
  { key: 'teams_contacts', label: 'Teams > Contacts', editKey: 'teams_contacts_edit' },
];

type Props = {
  readOnly?: boolean;
};

export default function TeamRolesAdmin({ readOnly = false }: Props) {
  const [roles, setRoles] = useState<TeamRoleRecord[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedRoleRecord = useMemo(
    () => roles.find((role) => role.name === selectedRole) ?? null,
    [roles, selectedRole]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await localDb.getTeamRoles();
        if (cancelled) return;
        setRoles(rows);
        if (!selectedRole && rows[0]) setSelectedRole(rows[0].name);
      } catch (error) {
        console.error('Failed to load team roles:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRole]);

  async function refreshRoles() {
    const rows = await localDb.getTeamRoles();
    setRoles(rows);
    if (!rows.find((row) => row.name === selectedRole)) {
      setSelectedRole(rows[0]?.name || '');
    }
  }

  async function createRole() {
    if (readOnly) return;
    const name = newRoleName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await localDb.createTeamRole(name);
      setNewRoleName('');
      await refreshRoles();
      setSelectedRole(name.toLowerCase().replace(/\s+/g, '_'));
    } catch (error) {
      console.error('Failed to create role:', error);
      alert(error instanceof Error ? error.message : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  }

  async function saveRolePermissions() {
    if (readOnly) return;
    if (!selectedRoleRecord) return;
    setSaving(true);
    try {
      await localDb.updateTeamRolePermissions(selectedRoleRecord.name, selectedRoleRecord.permissions);
      await refreshRoles();
    } catch (error) {
      console.error('Failed to save role permissions:', error);
      alert(error instanceof Error ? error.message : 'Failed to save role permissions');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole() {
    if (readOnly) return;
    if (!selectedRoleRecord || selectedRoleRecord.built_in) return;
    if (!window.confirm(`Delete role "${selectedRoleRecord.name}"?`)) return;
    setSaving(true);
    try {
      await localDb.deleteTeamRole(selectedRoleRecord.name);
      await refreshRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  }

  function setFeaturePermission(featureKey: string, enabled: boolean) {
    if (readOnly) return;
    setRoles((prev) =>
      prev.map((role) =>
        role.name === selectedRole
          ? {
              ...role,
              permissions: {
                ...role.permissions,
                [featureKey]: enabled,
              },
            }
          : role
      )
    );
  }

  function setFeatureEditPermission(featureKey: string, enabled: boolean) {
    setFeaturePermission(featureKey, enabled);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-violet-600" />
        <h2 className="text-2xl font-bold text-gray-800">Team Roles Admin</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Create Custom Role</h3>
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Ex: ops_manager"
          />
          <button
            type="button"
            onClick={() => void createRole()}
            disabled={saving || readOnly}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-70"
          >
            Add Role
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-800 mb-2">Roles</p>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => setSelectedRole(role.name)}
                  className={`w-full text-left px-3 py-2 rounded border ${
                    selectedRole === role.name
                      ? 'border-violet-500 bg-violet-50 text-violet-800'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {role.name}
                  {role.built_in ? ' (built-in)' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 border border-gray-200 rounded-lg p-3">
            {!selectedRoleRecord ? (
              <p className="text-sm text-gray-500">Select a role to edit permissions.</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  Editing: {selectedRoleRecord.name}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {FEATURE_LABELS.map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-gray-200"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedRoleRecord.permissions[feature.key])}
                          onChange={(e) => {
                            const viewEnabled = e.target.checked;
                            setFeaturePermission(feature.key, viewEnabled);
                            if (!viewEnabled && feature.editKey) {
                              setFeatureEditPermission(feature.editKey, false);
                            }
                          }}
                          disabled={readOnly}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <Eye className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-gray-700">{feature.label}</span>
                      </label>
                      {feature.editKey ? (
                        <button
                          type="button"
                          onClick={() =>
                            setFeatureEditPermission(
                              feature.editKey as string,
                              !selectedRoleRecord.permissions[feature.editKey as string]
                            )
                          }
                          disabled={readOnly || !selectedRoleRecord.permissions[feature.key]}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                            selectedRoleRecord.permissions[feature.editKey]
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-white text-slate-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title="Toggle edit permission"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {selectedRoleRecord.permissions[feature.editKey] ? 'Edit' : 'View Only'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">View only</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveRolePermissions()}
                    disabled={saving || readOnly}
                    className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-70"
                  >
                    Save Permissions
                  </button>
                  {!selectedRoleRecord.built_in && (
                    <button
                      type="button"
                      onClick={() => void deleteRole()}
                      disabled={saving || readOnly}
                      className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-70"
                    >
                      Delete Role
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
