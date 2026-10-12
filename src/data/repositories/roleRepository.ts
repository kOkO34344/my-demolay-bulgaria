import type {
  ID,
  ImportedPositionSummary,
  MappingPreview,
  PositionMappingInput,
  PositionRoleMapping,
  RoleAssignment,
  RoleAssignmentInput,
  RoleAssignmentQuery,
  RoleDefinition,
  SpecialAssignment,
  SpecialAssignmentInput,
  SpecialAssignmentQuery,
} from '@/domain';

/** Roles, assignments, special (time-boxed) permissions and position-to-role mappings. */
export interface RoleRepository {
  /** GET /api/v1/roles — role definitions with their permission grants. */
  listRoleDefinitions(): Promise<RoleDefinition[]>;

  /** GET /api/v1/role-assignments?chapter_id=&role= (role.read in scope) */
  listAssignments(query?: RoleAssignmentQuery): Promise<RoleAssignment[]>;

  /**
   * PUT /api/v1/members/{user_id}/role { role, scope, reason } — manual assignment.
   * @throws ForbiddenError('role_escalation' | 'self_action' | 'permission_denied') per checkAssignRole.
   */
  assignRole(input: RoleAssignmentInput): Promise<RoleAssignment>;

  /** GET /api/v1/special-assignments?user_id=&include_inactive= */
  listSpecialAssignments(query?: SpecialAssignmentQuery): Promise<SpecialAssignment[]>;

  /** POST /api/v1/special-assignments — @throws ValidationError (dates), ForbiddenError (escalation) */
  createSpecialAssignment(input: SpecialAssignmentInput): Promise<SpecialAssignment>;

  /** POST /api/v1/special-assignments/{id}/revoke { reason } */
  revokeSpecialAssignment(id: ID, reason: string): Promise<SpecialAssignment>;

  /** GET /api/v1/position-mappings */
  listMappings(): Promise<PositionRoleMapping[]>;

  /** POST /api/v1/position-mappings (role.mapping.manage) */
  createMapping(input: PositionMappingInput): Promise<PositionRoleMapping>;

  /** PUT /api/v1/position-mappings/{id} */
  updateMapping(id: ID, input: PositionMappingInput): Promise<PositionRoleMapping>;

  /** DELETE /api/v1/position-mappings/{id} */
  deleteMapping(id: ID): Promise<void>;

  /** GET /api/v1/position-mappings/preview?position_code= — evaluates rules without applying them. */
  previewMapping(positionCode: string): Promise<MappingPreview>;

  /** GET /api/v1/positions — distinct imported positions with member counts and mapping status. */
  listImportedPositions(): Promise<ImportedPositionSummary[]>;
}
