/*
 * Cereri între taburi: un card de pe Acasă poate cere ca tabul Sănătate să pornească un program.
 * Taburile rămân montate (App ascunde doar ce nu e vizibil), deci un eveniment pe window ajunge.
 */

const START_PROGRAM = 'corefit:start-program';

export function requestHealthProgram(programId: string): void {
  window.dispatchEvent(new CustomEvent<string>(START_PROGRAM, { detail: programId }));
}

/** Ascultă cererile; întoarce funcția de dezabonare (pentru useEffect). */
export function onHealthProgramRequest(handler: (programId: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(START_PROGRAM, listener);
  return () => window.removeEventListener(START_PROGRAM, listener);
}
