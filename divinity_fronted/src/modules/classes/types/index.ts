export interface ClassType {
  id: number;
  name: string;
  description: string;
  instructor_id: number | null;
  instructor_name: string;
  duration_minutes: number;
  capacity: number;
  is_active: boolean;
}

export interface CreateClassTypeData {
  name: string;
  description?: string;
  instructor_id?: number | null;
  duration_minutes?: number;
  capacity?: number;
}

export type UpdateClassTypeData = Partial<CreateClassTypeData> & { is_active?: boolean };

export interface ClassSchedule {
  id: number;
  class_type_id: number;
  class_type_name: string;
  weekday: number; // 0=lunes...6=domingo
  start_time: string;
  is_active: boolean;
}

export interface CreateScheduleData {
  class_type_id: number;
  weekday: number;
  start_time: string;
}

export type UpdateScheduleData = Partial<Pick<CreateScheduleData, 'weekday' | 'start_time'>> & { is_active?: boolean };

export type SessionStatus = 'scheduled' | 'cancelled';

export interface ClassSession {
  id: number;
  class_type_id: number;
  class_type_name: string;
  schedule_id: number | null;
  date: string;
  start_time: string;
  instructor_id: number | null;
  instructor_name: string;
  capacity: number;
  status: SessionStatus;
  enrolled_count: number;
}

export type EnrollmentStatus = 'booked' | 'attended' | 'no_show' | 'cancelled';

export interface ClassEnrollment {
  id: number;
  session_id: number;
  member_id: number;
  member_name: string;
  member_email: string;
  status: EnrollmentStatus;
  created_at: string | null;
}

export interface SessionDetail extends ClassSession {
  enrollments: ClassEnrollment[];
}
