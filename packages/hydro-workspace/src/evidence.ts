/** Client-visible scientific references already present in a DSH Session log. */
export interface ResearchEvidence { references:string[] }
declare module '@deepseek-ai/dsh-session-projection/types' {interface SessionProjectionMap{'hydro.workspace.evidence':ResearchEvidence}}
