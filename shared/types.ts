export type ShiftTemplate = {
  id: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  createdAt: string;
};

export type Shift = {
  id: string;
  userId: string;
  templateId: string | null;
  startDateTime: string;
  endDateTime: string;
  title: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type BatchRequest = {
  mode: "SET" | "REMOVE";
  templateId: string;
  dates: string[];
};

export type BatchResponse = {
  created: number;
  deleted: number;
  replaced: number;
};

export type UserInfo = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  icalUrl: string;
  authEnabled: boolean;
};

export type CreateTemplateInput = {
  title: string;
  startTime: string;
  endTime: string;
  color: string;
};

export type UpdateShiftInput = {
  title?: string;
  color?: string;
  startDateTime?: string;
  endDateTime?: string;
  templateId?: string;
};

export type ErrorResponse = {
  error: string;
};
