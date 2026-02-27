// AI SEO Service for profile keyword optimization
// For MVP, using simple keyword extraction algorithms
// In production, this would use ML models like TensorFlow.js or external APIs

interface ProfileData {
  skills: string[];
  profession: string;
  bio: string;
  achievements?: string[];
}

export class AISeoService {
  /**
   * Extract keywords from profile data
   */
  static extractKeywords(profileData: ProfileData): string[] {
    const keywords: Set<string> = new Set();

    // Add skills as keywords
    profileData.skills.forEach(skill => {
      keywords.add(skill.toLowerCase().trim());
    });

    // Add profession
    keywords.add(profileData.profession.toLowerCase().trim());

    // Extract keywords from bio
    const bioKeywords = this.extractFromText(profileData.bio);
    bioKeywords.forEach(kw => keywords.add(kw));

    // Extract from achievements
    if (profileData.achievements) {
      profileData.achievements.forEach(achievement => {
        const achKeywords = this.extractFromText(achievement);
        achKeywords.forEach(kw => keywords.add(kw));
      });
    }

    return Array.from(keywords);
  }

  /**
   * Extract keywords from text using simple NLP techniques
   */
  private static extractFromText(text: string): string[] {
    // Remove special characters and convert to lowercase
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');

    // Split into words
    const words = cleaned.split(/\s+/).filter(word => word.length > 0);

    // Remove common stop words
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'i', 'me', 'my', 'we', 'our', 'you',
      'your', 'this', 'these', 'those', 'am', 'been', 'have', 'had'
    ]);

    const keywords = words.filter(word => 
      word.length > 2 && !stopWords.has(word)
    );

    // Calculate word frequency (simple TF)
    const frequency: Map<string, number> = new Map();
    keywords.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    const sorted = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    return sorted.slice(0, 10); // Top 10 keywords
  }

  /**
   * Generate semantic tags based on profession and skills
   */
  static generateSemanticTags(profession: string, skills: string[]): string[] {
    const tags: Set<string> = new Set();

    // Map professions to related tags
    const professionMap: Record<string, string[]> = {
      'developer': ['software', 'programming', 'coding', 'tech'],
      'designer': ['creative', 'visual', 'ui', 'ux', 'graphics'],
      'manager': ['leadership', 'management', 'team', 'project'],
      'engineer': ['technical', 'engineering', 'systems', 'architecture'],
      'analyst': ['data', 'analysis', 'insights', 'research'],
      'marketer': ['marketing', 'digital', 'strategy', 'campaigns'],
      'writer': ['content', 'writing', 'communication', 'editorial']
    };

    // Find matching profession tags
    const profLower = profession.toLowerCase();
    Object.entries(professionMap).forEach(([key, values]) => {
      if (profLower.includes(key)) {
        values.forEach(tag => tags.add(tag));
      }
    });

    // Map skills to categories
    const skillCategories: Record<string, string> = {
      'javascript': 'web-development',
      'typescript': 'web-development',
      'react': 'frontend',
      'vue': 'frontend',
      'angular': 'frontend',
      'node': 'backend',
      'python': 'backend',
      'java': 'backend',
      'aws': 'cloud',
      'azure': 'cloud',
      'docker': 'devops',
      'kubernetes': 'devops',
      'figma': 'design',
      'photoshop': 'design'
    };

    skills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      Object.entries(skillCategories).forEach(([key, category]) => {
        if (skillLower.includes(key)) {
          tags.add(category);
        }
      });
    });

    return Array.from(tags);
  }

  /**
   * Optimize profile for search
   */
  static optimizeProfile(profileData: ProfileData): {
    keywords: string[];
    semanticTags: string[];
    rankingScore: number;
  } {
    const keywords = this.extractKeywords(profileData);
    const semanticTags = this.generateSemanticTags(
      profileData.profession,
      profileData.skills
    );

    // Calculate ranking score based on profile completeness
    let score = 0;
    score += profileData.skills.length * 10; // 10 points per skill
    score += profileData.bio.length > 100 ? 20 : 10; // Bonus for detailed bio
    score += (profileData.achievements?.length || 0) * 15; // 15 points per achievement
    score += keywords.length * 5; // 5 points per keyword

    return {
      keywords,
      semanticTags,
      rankingScore: Math.min(score, 100) // Cap at 100
    };
  }

  /**
   * Generate optimization suggestions
   */
  static generateSuggestions(profileData: ProfileData): string[] {
    const suggestions: string[] = [];

    if (profileData.skills.length < 3) {
      suggestions.push('Add more skills to improve discoverability');
    }

    if (profileData.bio.length < 100) {
      suggestions.push('Expand your bio to at least 100 characters');
    }

    if (!profileData.achievements || profileData.achievements.length === 0) {
      suggestions.push('Add achievements to showcase your experience');
    }

    if (profileData.skills.length > 10) {
      suggestions.push('Consider focusing on your top 10 most relevant skills');
    }

    return suggestions;
  }
}
