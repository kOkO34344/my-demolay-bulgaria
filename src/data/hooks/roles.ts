import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  ID,
  ImportedPositionSummary,
  MappingPreview,
  PositionMappingInput,
  PositionRoleMapping,
  RoleAssignment,
  RoleAssignmentInput,
  RoleRemovalInput,
  RoleAssignmentQuery,
  RoleDefinition,
  SpecialAssignment,
  SpecialAssignmentInput,
  SpecialAssignmentQuery,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Key: roles.definitions() */
export function useRoleDefinitions(options?: QueryOptions<RoleDefinition[]>) {
  return useQuery({
    queryKey: queryKeys.roles.definitions(),
    queryFn: () => repositories.roles.listRoleDefinitions(),
    staleTime: Infinity,
    ...options,
  });
}

/** Key: roles.assignments(query) */
export function useRoleAssignments(
  query: RoleAssignmentQuery = {},
  options?: QueryOptions<RoleAssignment[]>,
) {
  return useQuery({
    queryKey: queryKeys.roles.assignments(query),
    queryFn: () => repositories.roles.listAssignments(query),
    ...options,
  });
}

/** Key: roles.specialAssignments(query) */
export function useSpecialAssignments(
  query: SpecialAssignmentQuery = {},
  options?: QueryOptions<SpecialAssignment[]>,
) {
  return useQuery({
    queryKey: queryKeys.roles.specialAssignments(query),
    queryFn: () => repositories.roles.listSpecialAssignments(query),
    ...options,
  });
}

/** Key: roles.mappings() */
export function usePositionMappings(options?: QueryOptions<PositionRoleMapping[]>) {
  return useQuery({
    queryKey: queryKeys.roles.mappings(),
    queryFn: () => repositories.roles.listMappings(),
    ...options,
  });
}

/** Key: roles.mappingPreview(positionCode) */
export function useMappingPreview(
  positionCode: string | null | undefined,
  options?: QueryOptions<MappingPreview>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.roles.mappingPreview(positionCode ?? ''),
    queryFn: () => repositories.roles.previewMapping(positionCode ?? ''),
    enabled: !!positionCode && (options?.enabled ?? true),
  });
}

/** Key: roles.positions() */
export function useImportedPositions(options?: QueryOptions<ImportedPositionSummary[]>) {
  return useQuery({
    queryKey: queryKeys.roles.positions(),
    queryFn: () => repositories.roles.listImportedPositions(),
    ...options,
  });
}

function useRoleCommand<V, T>(fn: (variables: V) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidateDomains(client, ['roles', 'members', 'audit', 'chapters', 'sync']),
  });
}

export const useAssignRole = () =>
  useRoleCommand((input: RoleAssignmentInput) => repositories.roles.assignRole(input));
export const useRemoveRole = () =>
  useRoleCommand((input: RoleRemovalInput) => repositories.roles.removeRole(input));
export const useCreateSpecialAssignment = () =>
  useRoleCommand((input: SpecialAssignmentInput) =>
    repositories.roles.createSpecialAssignment(input),
  );
export const useRevokeSpecialAssignment = () =>
  useRoleCommand(({ id, reason }: { id: ID; reason: string }) =>
    repositories.roles.revokeSpecialAssignment(id, reason),
  );
export const useCreateMapping = () =>
  useRoleCommand((input: PositionMappingInput) => repositories.roles.createMapping(input));
export const useUpdateMapping = () =>
  useRoleCommand(({ id, input }: { id: ID; input: PositionMappingInput }) =>
    repositories.roles.updateMapping(id, input),
  );
export const useDeleteMapping = () =>
  useRoleCommand((id: ID) => repositories.roles.deleteMapping(id));
