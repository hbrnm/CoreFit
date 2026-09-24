import type { EvidenceLevel } from './health';
import type { PreventionId } from '../lib/db';

export interface PreventionItem {
  id: PreventionId;
  title: string;
  body: string;
  evidence: EvidenceLevel;
  sourceLabel: string;
  sourceDetail: string;
  sourceUrl: string;
}

/**
 * Listă organizatorică, nu un calendar medical și nu un diagnostic.
 * Intervalele le stabilește medicul. Sursele sunt ghiduri sau sinteze publice.
 */
export const PREVENTION_ITEMS: readonly PreventionItem[] = [
  {
    id: 'bp',
    title: 'Tensiune arterială',
    body: 'OMS recomandă ca adulții să își măsoare tensiunea. Aplicația nu interpretează valorile. Notează doar că ai verificat, și discută rezultatul cu medicul.',
    evidence: 'guideline',
    sourceLabel: 'OMS, ghid de hipertensiune la adulți, 2021',
    sourceDetail: 'Guideline for the pharmacological treatment of hypertension in adults.',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240033986',
  },
  {
    id: 'dental',
    title: 'Sănătate dentară',
    body: 'Sănătatea orală face parte din sănătatea generală. Cât de des mergi la dentist se stabilește cu medicul dentist, nu din aplicație.',
    evidence: 'general',
    sourceLabel: 'OMS, fișă despre sănătatea orală',
    sourceDetail: 'Oral health. World Health Organization.',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/oral-health',
  },
  {
    id: 'vision',
    title: 'Vedere',
    body: 'Academia Americană de Oftalmologie recomandă un examen oftalmologic de referință în jur de 40 de ani, dacă nu ai simptome sau factori de risc, și mai devreme dacă vezi mai greu. Apoi intervalul îl stabilește medicul.',
    evidence: 'guideline',
    sourceLabel: 'American Academy of Ophthalmology, examinări oculare',
    sourceDetail: 'Eye exams 101.',
    sourceUrl: 'https://www.aao.org/eye-health/tips-prevention/eye-exams-101',
  },
  {
    id: 'hearing',
    title: 'Auz',
    body: 'Dacă auzi mai greu conversațiile sau televizorul, cere o verificare. Aplicația nu testează auzul și nu pune un diagnostic.',
    evidence: 'general',
    sourceLabel: 'OMS, fișă despre pierderea auzului',
    sourceDetail: 'Deafness and hearing loss. World Health Organization.',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss',
  },
  {
    id: 'vaccines',
    title: 'Vaccinări',
    body: 'Schema depinde de vârstă și de țară. Verifică cu medicul de familie dacă vaccinările recomandate pentru tine sunt la zi. Aplicația nu ține un calendar de vaccinuri.',
    evidence: 'general',
    sourceLabel: 'OMS, vaccinuri și imunizare',
    sourceDetail: 'Vaccines and immunization. World Health Organization.',
    sourceUrl: 'https://www.who.int/health-topics/vaccines-and-immunization',
  },
  {
    id: 'screening',
    title: 'Controale preventive',
    body: 'Nu există un singur set de analize valabil pentru toată lumea. Întreabă medicul de familie ce controale se potrivesc vârstei și istoricului tău.',
    evidence: 'general',
    sourceLabel: 'OMS Europa, ghid scurt despre programe de screening, 2020',
    sourceDetail: 'Screening programmes: a short guide.',
    sourceUrl: 'https://www.who.int/europe/publications/i/item/9789289054782',
  },
];
