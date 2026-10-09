import { apiFetch } from "./client";
import {
  ProjectTree,
  SceneTreeNode,
  SceneDetail,
  ActDetail,
  ActTreeNode,
  SequenceDetail,
  SequenceTreeNode,
} from "../types";

export const narrativeApi = {
  getProjectTree: (projectId: string) => apiFetch<ProjectTree>(`/narrative/projects/${projectId}/tree`),
  importScript: (projectId: string, payload: { script_text: string }) =>
    apiFetch<{ message: string; scene_count: number }>(`/narrative/projects/${projectId}/import-script`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reorderScene: (payload: { scene_id: string; target_sequence_id?: string; new_order_index: string }) =>
    apiFetch<SceneTreeNode>("/narrative/scenes/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSceneDetail: (sceneId: string) => apiFetch<SceneDetail>(`/narrative/scenes/${sceneId}`),
  updateScene: (sceneId: string, payload: Partial<SceneDetail>) =>
    apiFetch<SceneDetail>(`/narrative/scenes/${sceneId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createScene: (payload: {
    sequence_id?: string;
    scene_number: string;
    set_name: string;
    int_ext: string;
    time_of_day: string;
    pages_eighths?: number;
    estimated_shoot_minutes?: number;
    synopsis?: string;
  }) =>
    apiFetch<SceneTreeNode>("/narrative/scenes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Acts
  getActDetail: (actId: string) => apiFetch<ActDetail>(`/narrative/acts/${actId}`),
  updateAct: (actId: string, payload: { title?: string; order_index?: string; target_page_length?: number; dramatic_milestone?: string }) =>
    apiFetch<ActDetail>(`/narrative/acts/${actId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createAct: (payload: { project_id: string; title: string; order_index?: string; target_page_length?: number; dramatic_milestone?: string }) =>
    apiFetch<ActTreeNode>("/narrative/acts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteAct: (actId: string) =>
    apiFetch<{ success: boolean }>(`/narrative/acts/${actId}`, {
      method: "DELETE",
    }),

  // Sequences
  getSequenceDetail: (sequenceId: string) => apiFetch<SequenceDetail>(`/narrative/sequences/${sequenceId}`),
  updateSequence: (sequenceId: string, payload: { title?: string; order_index?: string; color_tag?: string; dramatic_question?: string; temp_score_reference?: string; continuity_notes?: string }) =>
    apiFetch<SequenceDetail>(`/narrative/sequences/${sequenceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createSequence: (payload: { act_id: string; title: string; order_index?: string; color_tag?: string; dramatic_question?: string; temp_score_reference?: string; continuity_notes?: string }) =>
    apiFetch<SequenceTreeNode>("/narrative/sequences", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteSequence: (sequenceId: string) =>
    apiFetch<{ success: boolean }>(`/narrative/sequences/${sequenceId}`, {
      method: "DELETE",
    }),

  // ADR Cues
  getSceneAdrCues: (projectId: string, sceneId: string) =>
    apiFetch<any[]>(`/narrative/projects/${projectId}/scenes/${sceneId}/adr`),
  createSceneAdrCue: (projectId: string, sceneId: string, payload: { character_name: string; line_text: string; timecode?: string | null; reason: string }) =>
    apiFetch<any>(`/narrative/projects/${projectId}/scenes/${sceneId}/adr`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdrCueStatus: (projectId: string, cueId: string, status: string) =>
    apiFetch<any>(`/narrative/projects/${projectId}/adr/${cueId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
