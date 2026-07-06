'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { TeamMemberModal } from '@/components/forms/TeamMemberModal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getUserRoleLabel } from '@fleetos/shared-types';
import { formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { logErrorDev } from '@/lib/logger';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  driver?: { id: string; firstName: string; lastName: string } | null;
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    COMPANY_ADMIN: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    DISPATCHER: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    ACCOUNTING: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    DRIVER: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role] || 'bg-gray-500/15 text-gray-300 border-gray-500/30'}`}>
      {getUserRoleLabel(role)}
    </span>
  );
}

export default function TeamMembersPage() {
  const router = useRouter();
  const { can } = usePermission();
  const currentUser = useAuthStore((s) => s.user);
  const canManage = can('company:write');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberToDeactivate, setMemberToDeactivate] = useState<TeamMember | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const params = new URLSearchParams({ status: statusFilter, limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/users?${params}`);
      setMembers(res.data.data || []);
    } catch (err) {
      logErrorDev('team-members', err);
      setFetchError(getApiErrorMessage(err, 'Failed to load team members'));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (!canManage) {
      router.replace('/dashboard/settings');
      return;
    }
    void fetchMembers();
  }, [canManage, fetchMembers, router]);

  const handleDeactivate = async () => {
    if (!memberToDeactivate) return;
    setDeactivatingId(memberToDeactivate.id);
    try {
      await api.delete(`/users/${memberToDeactivate.id}`);
      setToast({
        type: 'success',
        message: `${memberToDeactivate.firstName} ${memberToDeactivate.lastName} deactivated`,
      });
      setMemberToDeactivate(null);
      void fetchMembers();
    } catch (err) {
      setToast({ type: 'error', message: getApiErrorMessage(err, 'Failed to deactivate account') });
    } finally {
      setDeactivatingId(null);
    }
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Create and manage company login accounts with role-based access"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/settings" className="btn btn-secondary text-sm">
              Back to Settings
            </Link>
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={() => {
                setEditingMember(null);
                setShowModal(true);
              }}
            >
              Add Member
            </button>
          </div>
        }
      />

      <div className="card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className="input max-w-md"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-full sm:w-44"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
          >
            <option value="active">Active accounts</option>
            <option value="inactive">Inactive accounts</option>
            <option value="all">All accounts</option>
          </select>
        </div>

        {loading ? (
          <LoadingBlock rows={5} />
        ) : fetchError ? (
          <ErrorState message={fetchError} onRetry={() => void fetchMembers()} />
        ) : members.length === 0 ? (
          <EmptyState
            title="No team members yet"
            description="Create dispatcher, accounting, admin, or driver login accounts for your company."
          />
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="data-table mobile-card-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <tr key={member.id}>
                      <td data-primary="true" className="font-medium text-gray-100">
                        {member.firstName} {member.lastName}
                        {isSelf ? <span className="ml-2 text-xs text-gray-500">(you)</span> : null}
                      </td>
                      <td data-label="Email" className="text-gray-400">{member.email}</td>
                      <td data-label="Role"><RoleBadge role={member.role} /></td>
                      <td data-label="Status">
                        <span className={member.isActive ? 'text-emerald-400' : 'text-gray-500'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td data-label="Last Login" className="text-gray-500">
                        {member.lastLoginAt ? formatDate(member.lastLoginAt) : 'Never'}
                      </td>
                      <td data-label="Actions" className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary text-xs px-3 py-1.5"
                            onClick={() => {
                              setEditingMember(member);
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </button>
                          {member.isActive && !isSelf ? (
                            <button
                              type="button"
                              className="btn btn-secondary text-xs px-3 py-1.5 text-red-400 hover:text-red-300"
                              onClick={() => setMemberToDeactivate(member)}
                            >
                              Deactivate
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TeamMemberModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMember(null);
        }}
        onSuccess={() => {
          setToast({
            type: 'success',
            message: editingMember ? 'Team member updated' : 'Team member created',
          });
          void fetchMembers();
        }}
        member={editingMember}
      />

      <ConfirmDialog
        open={Boolean(memberToDeactivate)}
        title="Deactivate account?"
        message={
          memberToDeactivate
            ? `${memberToDeactivate.firstName} ${memberToDeactivate.lastName} will no longer be able to sign in.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="danger"
        loading={Boolean(deactivatingId)}
        onConfirm={() => void handleDeactivate()}
        onCancel={() => setMemberToDeactivate(null)}
      />

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
