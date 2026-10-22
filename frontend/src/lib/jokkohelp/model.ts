/** Modèles de présentation locaux. Ce ne sont pas des DTO API ni des types générés. */
export type ContentBlock = { kind: 'paragraph'; text: string; heading?: string } | { kind: 'code'; text: string; language: string };
export type Author = { photoUrl?:string|null; name: string; country: string; reference?:string };
export type AnswerView = { id: string; author: Author; date: string; content: ContentBlock[] };
export type QuestionView = { id: string; title: string; excerpt: string; technologies: string[]; author: Author; date: string; updated?: string; content: ContentBlock[]; answers: AnswerView[]; acceptedAnswerId?: string; resolved?:boolean; answerCount?:number };
