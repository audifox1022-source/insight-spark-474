// ============================================================
// src/services/ai/knowledgeStore.ts
// [LLM WIKI PATTERN] Persistent, compounding knowledge vault
// Karpathy's LLM Wiki pattern implementation for Insight Spark
// ============================================================

export interface WikiNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastModified: number;
}

const WIKI_STORAGE_KEY = 'work-ai-knowledge-vault';

export const knowledgeStore = {
  /**
   * 위키의 모든 노트를 가져옵니다.
   */
  getAllNotes(): WikiNote[] {
    try {
      const data = localStorage.getItem(WIKI_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[KnowledgeStore] Failed to load notes", e);
      return [];
    }
  },

  /**
   * 새로운 지식을 저장하거나 기존 노트를 업데이트합니다.
   */
  saveNote(note: Omit<WikiNote, 'lastModified'>): void {
    const notes = this.getAllNotes();
    const existingIndex = notes.findIndex(n => n.id === note.id || n.title === note.title);
    
    const newNote: WikiNote = {
      ...note,
      lastModified: Date.now()
    };

    if (existingIndex > -1) {
      notes[existingIndex] = newNote;
    } else {
      notes.push(newNote);
    }

    localStorage.setItem(WIKI_STORAGE_KEY, JSON.stringify(notes));
  },

  /**
   * 지식 검색 (간단한 키워드 매칭 기반)
   */
  searchNotes(query: string): WikiNote[] {
    const notes = this.getAllNotes();
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery) ||
      n.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * AI에게 전달하기 위한 위키 인덱스 (요약본) 생성
   */
  getWikiIndex(category?: string): string {
    const notes = this.getAllNotes();
    const filtered = category ? notes.filter(n => n.category === category) : notes;
    
    if (filtered.length === 0) return "현재 저장된 지식이 없습니다.";

    return filtered
      .map(n => `- [${n.title}]: ${n.content.substring(0, 100)}...`)
      .join('\n');
  },

  /**
   * 특정 노트의 상세 내용을 가져옵니다.
   */
  getNoteContent(title: string): string | null {
    const notes = this.getAllNotes();
    const note = notes.find(n => n.title === title);
    return note ? note.content : null;
  },

  /**
   * 모든 지식 삭제 (초기화)
   */
  clearAllKnowledge(): void {
    localStorage.removeItem(WIKI_STORAGE_KEY);
  }
};
