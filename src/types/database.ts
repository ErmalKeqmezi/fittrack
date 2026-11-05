
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "body_measurements": {
                  Row: {
                    "biceps_cm": number | null,"body_fat_percent": number | null,"calves_cm": number | null,"chest_cm": number | null,"created_at": string,"forearms_cm": number | null,"height_cm": number | null,"hips_cm": number | null,"id": string,"measured_on": string,"neck_cm": number | null,"quads_cm": number | null,"shoulders_cm": number | null,"updated_at": string,"user_id": string,"waist_cm": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "biceps_cm"?: number | null,"body_fat_percent"?: number | null,"calves_cm"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"forearms_cm"?: number | null,"height_cm"?: number | null,"hips_cm"?: number | null,"id"?: string,"measured_on": string,"neck_cm"?: number | null,"quads_cm"?: number | null,"shoulders_cm"?: number | null,"updated_at"?: string,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "biceps_cm"?: number | null,"body_fat_percent"?: number | null,"calves_cm"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"forearms_cm"?: number | null,"height_cm"?: number | null,"hips_cm"?: number | null,"id"?: string,"measured_on"?: string,"neck_cm"?: number | null,"quads_cm"?: number | null,"shoulders_cm"?: number | null,"updated_at"?: string,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "body_measurements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercise_secondary_muscles": {
                  Row: {
                    "exercise_id": string,"muscle_group_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"muscle_group_id": number
                  }
                  Update: {
                    "exercise_id"?: string,"muscle_group_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_secondary_muscles_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_secondary_muscles_muscle_group_id_fkey"
      columns: ["muscle_group_id"]
isOneToOne: false
      referencedRelation: "muscle_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"exercise_sets": {
                  Row: {
                    "created_at": string,"id": string,"is_completed": boolean,"is_warmup": boolean,"notes": string | null,"reps": number,"rpe": number | null,"session_exercise_id": string,"set_number": number,"updated_at": string,"user_id": string,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_completed"?: boolean,"is_warmup"?: boolean,"notes"?: string | null,"reps": number,"rpe"?: number | null,"session_exercise_id": string,"set_number": number,"updated_at"?: string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_completed"?: boolean,"is_warmup"?: boolean,"notes"?: string | null,"reps"?: number,"rpe"?: number | null,"session_exercise_id"?: string,"set_number"?: number,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_sets_session_exercise_id_user_id_fkey"
      columns: ["session_exercise_id","user_id"]
isOneToOne: false
      referencedRelation: "exercise_session_bests"
      referencedColumns: ["session_exercise_id","user_id"]
    },{
      foreignKeyName: "exercise_sets_session_exercise_id_user_id_fkey"
      columns: ["session_exercise_id","user_id"]
isOneToOne: false
      referencedRelation: "session_exercises"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "category": string,"created_at": string,"description": string | null,"equipment": string,"id": string,"is_archived": boolean,"name": string,"primary_muscle_group_id": number,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"description"?: string | null,"equipment": string,"id"?: string,"is_archived"?: boolean,"name": string,"primary_muscle_group_id": number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"equipment"?: string,"id"?: string,"is_archived"?: boolean,"name"?: string,"primary_muscle_group_id"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_primary_muscle_group_id_fkey"
      columns: ["primary_muscle_group_id"]
isOneToOne: false
      referencedRelation: "muscle_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercises_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"muscle_groups": {
                  Row: {
                    "body_region": string,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body_region": string,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "body_region"?: string,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"personal_records": {
                  Row: {
                    "achieved_at": string,"created_at": string,"exercise_id": string,"exercise_set_id": string | null,"id": string,"record_type": string,"reps": number,"session_id": string | null,"updated_at": string,"user_id": string,"value": number,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_at": string,"created_at"?: string,"exercise_id": string,"exercise_set_id"?: string | null,"id"?: string,"record_type": string,"reps": number,"session_id"?: string | null,"updated_at"?: string,"user_id"?: string,"value": number,"weight_kg": number
                  }
                  Update: {
                    "achieved_at"?: string,"created_at"?: string,"exercise_id"?: string,"exercise_set_id"?: string | null,"id"?: string,"record_type"?: string,"reps"?: number,"session_id"?: string | null,"updated_at"?: string,"user_id"?: string,"value"?: number,"weight_kg"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "personal_records_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_exercise_set_id_fkey"
      columns: ["exercise_set_id"]
isOneToOne: false
      referencedRelation: "exercise_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "exercise_session_bests"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "personal_records_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "session_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "personal_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_exercises": {
                  Row: {
                    "created_at": string,"exercise_id": string,"id": string,"notes": string | null,"position": number,"rest_seconds": number | null,"target_reps_max": number,"target_reps_min": number,"target_rpe": number | null,"target_sets": number,"updated_at": string,"user_id": string,"workout_day_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exercise_id": string,"id"?: string,"notes"?: string | null,"position": number,"rest_seconds"?: number | null,"target_reps_max": number,"target_reps_min": number,"target_rpe"?: number | null,"target_sets": number,"updated_at"?: string,"user_id"?: string,"workout_day_id": string
                  }
                  Update: {
                    "created_at"?: string,"exercise_id"?: string,"id"?: string,"notes"?: string | null,"position"?: number,"rest_seconds"?: number | null,"target_reps_max"?: number,"target_reps_min"?: number,"target_rpe"?: number | null,"target_sets"?: number,"updated_at"?: string,"user_id"?: string,"workout_day_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_exercises_workout_day_id_user_id_fkey"
      columns: ["workout_day_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_days"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"timezone": string,"updated_at": string,"weight_unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"timezone"?: string,"updated_at"?: string,"weight_unit"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"timezone"?: string,"updated_at"?: string,"weight_unit"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rest_alerts": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"ends_at": string,"label": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"ends_at": string,"label"?: string,"p256dh": string,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"ends_at"?: string,"label"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rest_alerts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"session_exercises": {
                  Row: {
                    "created_at": string,"exercise_id": string,"exercise_name": string,"id": string,"notes": string | null,"position": number,"session_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exercise_id": string,"exercise_name": string,"id"?: string,"notes"?: string | null,"position": number,"session_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"exercise_id"?: string,"exercise_name"?: string,"id"?: string,"notes"?: string | null,"position"?: number,"session_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "session_summaries"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "session_exercises_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workout_days": {
                  Row: {
                    "created_at": string,"id": string,"is_rest_day": boolean,"name": string,"notes": string | null,"plan_id": string,"position": number,"updated_at": string,"user_id": string,"weekday": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_rest_day"?: boolean,"name": string,"notes"?: string | null,"plan_id": string,"position": number,"updated_at"?: string,"user_id"?: string,"weekday"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_rest_day"?: boolean,"name"?: string,"notes"?: string | null,"plan_id"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string,"weekday"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_days_plan_id_user_id_fkey"
      columns: ["plan_id","user_id"]
isOneToOne: false
      referencedRelation: "workout_plans"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workout_plans": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"template_key": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"template_key"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"template_key"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_plans_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_sessions": {
                  Row: {
                    "created_at": string,"ended_at": string | null,"id": string,"name": string,"notes": string | null,"plan_id": string | null,"started_at": string,"status": string,"updated_at": string,"user_id": string,"workout_day_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"plan_id"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string,"workout_day_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"plan_id"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string,"workout_day_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sessions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "workout_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sessions_workout_day_id_fkey"
      columns: ["workout_day_id"]
isOneToOne: false
      referencedRelation: "workout_days"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "exercise_session_bests": {
                  Row: {
                    "best_e1rm_kg": number | null,"exercise_id": string,"exercise_name": string,"max_reps": number | null,"session_exercise_id": string,"session_id": string,"started_at": string,"top_weight_kg": number | null,"top_weight_reps": number | null,"user_id": string,"volume_kg": number | null,"working_set_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "session_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"session_summaries": {
                  Row: {
                    "ended_at": string | null,"exercise_count": number | null,"id": string,"name": string,"plan_id": string | null,"started_at": string,"status": string,"user_id": string,"volume_kg": number | null,"working_set_count": number | null,"workout_day_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "workout_sessions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "workout_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sessions_workout_day_id_fkey"
      columns: ["workout_day_id"]
isOneToOne: false
      referencedRelation: "workout_days"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_plan_exercise":
{ Args: { "p_day_id": string,"p_exercise_id": string,"p_notes"?: string,"p_rest_seconds"?: number,"p_target_reps_max": number,"p_target_reps_min": number,"p_target_sets": number }; Returns: string
                           },
"add_workout_day":
{ Args: { "p_is_rest_day"?: boolean,"p_name": string,"p_plan_id": string,"p_weekday"?: number }; Returns: string
                           },
"create_workout_plan":
{ Args: { "p_days"?: Json,"p_description"?: string,"p_name": string,"p_template_key"?: string }; Returns: string
                           },
"delete_workout_session":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"estimate_1rm":
{ Args: { "reps": number,"weight_kg": number }; Returns: number
                           },
"finish_workout_session":
{ Args: { "p_session_id": string }; Returns: {
              "exercise_id": string,"exercise_name": string,"previous_value": number,"record_type": string,"reps": number,"value": number,"weight_kg": number
            }[]
                           },
"get_previous_performance":
{ Args: { "p_before": string,"p_exclude_session_id"?: string,"p_exercise_ids": (string)[] }; Returns: {
              "exercise_id": string,"is_warmup": boolean,"reps": number,"rpe": number,"session_id": string,"set_number": number,"started_at": string,"weight_kg": number
            }[]
                           },
"is_setup_complete":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_valid_timezone":
{ Args: { "tz": string }; Returns: boolean
                           },
"move_plan_exercise":
{ Args: { "p_offset": number,"p_plan_exercise_id": string }; Returns: undefined
                           },
"move_workout_day":
{ Args: { "p_day_id": string,"p_offset": number }; Returns: undefined
                           },
"recompute_personal_records":
{ Args: { "p_exercise_ids": (string)[] }; Returns: undefined
                           },
"save_custom_exercise":
{ Args: { "p_category": string,"p_description": string,"p_equipment": string,"p_exercise_id"?: string,"p_name": string,"p_primary_muscle_group_id": number,"p_secondary_muscle_group_ids": (number)[] }; Returns: string
                           },
"save_workout_session":
{ Args: { "p_ended_at"?: string,"p_exercises": Json,"p_name": string,"p_notes": string,"p_session_id": string,"p_started_at"?: string }; Returns: string
                           },
"set_active_plan":
{ Args: { "p_active": boolean,"p_plan_id": string }; Returns: undefined
                           },
"start_workout_session":
{ Args: { "p_workout_day_id"?: string }; Returns: string
                           },
"update_workout_day":
{ Args: { "p_day_id": string,"p_is_rest_day": boolean,"p_name": string,"p_notes"?: string,"p_weekday": number }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
