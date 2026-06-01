// API Response Envelope
export interface ApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

// API Error Shape
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  success: false;
}

// Query Filter Types
export interface MeetingFilters {
  status?: string;
  page?: number;
  limit?: number;
  team?: string;
}

export interface TaskFilters {
  status?: string;
  assignee?: string;
  meeting?: string;
  team?: string;
  page?: number;
  limit?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
