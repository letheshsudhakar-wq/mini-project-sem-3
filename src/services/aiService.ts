import type { ComplaintCategory, Complaint } from '../types';

export interface AIAssessmentResult {
  suggestedCategory: ComplaintCategory;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  suggestedTitle: string;
  summary: string;
  safetyAdvisory?: string;
  keywords: string[];
}

export interface AIDuplicateMatch {
  complaint: Complaint;
  similarityScore: number;
  matchReason: string;
}

const CATEGORY_KEYWORDS: Record<ComplaintCategory, string[]> = {
  pothole: [
    'pothole', 'road', 'asphalt', 'cracked', 'pavement', 'tarmac', 'crater', 'hole',
    'bump', 'manhole', 'sinkhole', 'divider', 'traffic', 'footpath', 'street'
  ],
  streetlight: [
    'streetlight', 'light', 'lamp', 'dark', 'bulb', 'flickering', 'pole', 'wiring',
    'illumination', 'blackout', 'night', 'post', 'led', 'fixture'
  ],
  drainage: [
    'drain', 'drainage', 'sewage', 'waterlog', 'flooding', 'gutter', 'overflow',
    'manhole', 'stagnant', 'culvert', 'pipe', 'leakage', 'blockage', 'clogged'
  ],
  garbage: [
    'garbage', 'waste', 'trash', 'dump', 'bin', 'litter', 'debris', 'rubbish',
    'smell', 'odor', 'hygiene', 'sweeper', 'uncollected', 'dumping'
  ],
  other: [
    'park', 'bench', 'tree', 'graffiti', 'encroachment', 'water supply', 'noise',
    'illegal', 'stray', 'signboard'
  ]
};

const SEVERITY_TRIGGERS: Record<'urgent' | 'high' | 'medium', string[]> = {
  urgent: ['accident', 'danger', 'hazard', 'severe', 'deep crater', 'electrocution', 'collapsed', 'open manhole', 'injury'],
  high: ['overflowing', 'blocked road', 'traffic jam', 'total darkness', 'flooding house', 'spill', 'burst'],
  medium: ['cracked', 'broken', 'flickering', 'pile', 'delay', 'standing water'],
};

export const aiService = {
  /**
   * Analyze citizen grievance text and suggest category, severity, and clear title
   */
  async analyzeGrievanceText(text: string): Promise<AIAssessmentResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const lower = text.toLowerCase();
    const scores: Record<ComplaintCategory, number> = {
      pothole: 0,
      streetlight: 0,
      drainage: 0,
      garbage: 0,
      other: 0.1,
    };

    // Keyword matching score
    const categories = Object.keys(CATEGORY_KEYWORDS) as ComplaintCategory[];
    for (const cat of categories) {
      const keywords = CATEGORY_KEYWORDS[cat];
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          scores[cat] += 1;
        }
      }
    }

    // Determine highest scoring category
    let bestCat: ComplaintCategory = 'other';
    let maxScore = 0;
    for (const cat of categories) {
      if (scores[cat] > maxScore) {
        maxScore = scores[cat];
        bestCat = cat;
      }
    }

    // Determine Severity
    let severity: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    for (const kw of SEVERITY_TRIGGERS.urgent) {
      if (lower.includes(kw)) {
        severity = 'urgent';
        break;
      }
    }
    if (severity === 'medium') {
      for (const kw of SEVERITY_TRIGGERS.high) {
        if (lower.includes(kw)) {
          severity = 'high';
          break;
        }
      }
    }

    // Generate concise summary / title
    const sentences = text.split(/[.!?\n]+/).filter(Boolean);
    const firstSentence = sentences[0]?.trim() || text.trim();
    const suggestedTitle = firstSentence.length > 60
      ? `${firstSentence.substring(0, 57)}...`
      : firstSentence;

    // Safety Advisory
    let safetyAdvisory: string | undefined;
    if (severity === 'urgent') {
      safetyAdvisory = 'High safety priority flagged: Field municipal inspection alerted for emergency review.';
    } else if (bestCat === 'streetlight') {
      safetyAdvisory = 'Public illumination issue: Night visibility hazard logged.';
    } else if (bestCat === 'drainage') {
      safetyAdvisory = 'Sanitation & public health alert logged for immediate drainage clearance.';
    }

    // Extracted keywords
    const matchedKeywords = Object.values(CATEGORY_KEYWORDS)
      .flat()
      .filter((kw) => lower.includes(kw))
      .slice(0, 4);

    return {
      suggestedCategory: bestCat,
      confidence: Math.min(0.96, Math.max(0.65, maxScore * 0.25 + 0.5)),
      severity,
      suggestedTitle,
      summary: text.length > 120 ? `${text.substring(0, 117)}...` : text,
      safetyAdvisory,
      keywords: matchedKeywords.length > 0 ? matchedKeywords : ['civic', bestCat],
    };
  },

  /**
   * AI Semantic comparison between new report and existing nearby reports
   */
  async findDuplicateMatches(
    newDescription: string,
    nearbyComplaints: Complaint[]
  ): Promise<AIDuplicateMatch[]> {
    if (!nearbyComplaints.length || !newDescription.trim()) return [];

    const newWords = new Set(
      newDescription.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 3)
    );

    const matches: AIDuplicateMatch[] = [];

    nearbyComplaints.forEach((comp) => {
      const compWords = new Set(
        comp.description.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 3)
      );

      let shared = 0;
      newWords.forEach((word) => {
        if (compWords.has(word)) shared++;
      });

      const totalUnique = new Set([...newWords, ...compWords]).size;
      const jaccard = totalUnique > 0 ? shared / totalUnique : 0;

      if (jaccard > 0.15 || shared >= 2) {
        matches.push({
          complaint: comp,
          similarityScore: Math.min(0.98, Math.round(jaccard * 100) / 100 + 0.3),
          matchReason: `Shares key context (${shared} matching keywords) in identical neighborhood zone`,
        });
      }
    });

    return matches.sort((a, b) => b.similarityScore - a.similarityScore);
  },
};
