import { apiFetch } from "./client";
import {
  ScheduleData,
  ShootDayDetail,
  StripboardItemDetail,
  ShootDay,
  DoodData,
  DPROut,
  DPRIn,
  CrewMemberOut,
  CrewMemberIn,
} from "../types";

export const productionApi = {
  getSchedule: (projectId: string) =>
    apiFetch<ScheduleData>(`/logistics/projects/${projectId}/schedule`),
  generateCallSheet: (shootDayId: string) =>
    apiFetch<{ message: string }>(`/logistics/shoot-days/${shootDayId}/generate-call-sheet`, {
      method: "POST",
    }),
  createShootDay: (payload: {
    project_id?: string;
    unit_id?: string;
    day_number: number;
    calendar_date: string;
    general_crew_call?: string;
    shooting_call?: string;
    hospital_address?: string;
  }) =>
    apiFetch<ShootDayDetail>("/logistics/shoot-days", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reorderStrip: (payload: { strip_id: string; target_shoot_day_id: string; new_order_index: string }) =>
    apiFetch<StripboardItemDetail>("/logistics/strips/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  scheduleSceneStrip: (payload: { scene_id: string; shoot_day_id: string; order_index?: string }) =>
    apiFetch<StripboardItemDetail>("/logistics/strips/schedule-scene", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addBannerStrip: (payload: { shoot_day_id: string; banner_label: string; order_index?: string }) =>
    apiFetch<StripboardItemDetail>("/logistics/strips/banner", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteStrip: (stripId: string) =>
    apiFetch<{ success: boolean }>(`/logistics/strips/${stripId}`, {
      method: "DELETE",
    }),
  getDoodMatrix: (projectId: string) =>
    apiFetch<DoodData>(`/logistics/projects/${projectId}/dood`),
  getStripboard: (projectId: string) =>
    apiFetch<ShootDay[]>(`/logistics/projects/${projectId}/stripboard`),
  getDPR: (shootDayId: string) =>
    apiFetch<DPROut>(`/logistics/shoot-days/${shootDayId}/dpr`),
  updateDPR: (shootDayId: string, payload: DPRIn) =>
    apiFetch<DPROut>(`/logistics/shoot-days/${shootDayId}/dpr`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCrew: (projectId: string) =>
    apiFetch<CrewMemberOut[]>(`/logistics/projects/${projectId}/crew`),
  getCrewMembers: (projectId: string) =>
    apiFetch<CrewMemberOut[]>(`/logistics/projects/${projectId}/crew`),
  createCrewMember: (projectId: string, payload: CrewMemberIn) =>
    apiFetch<CrewMemberOut>(`/logistics/projects/${projectId}/crew`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCrewMember: (crewId: string, payload: CrewMemberIn) =>
    apiFetch<CrewMemberOut>(`/logistics/crew/${crewId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCrewMember: (crewId: string) =>
    apiFetch<{ success: boolean }>(`/logistics/crew/${crewId}`, {
      method: "DELETE",
    }),
};

export const logisticsApi = productionApi;
