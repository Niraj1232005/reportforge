export type EditableField = "title" | "content";

export interface ReportImage {
  id: string;
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface ReportSubsection {
  id: string;
  title: string;
  content: string;
  images?: ReportImage[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  images?: ReportImage[];
  subsections: ReportSubsection[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  style?: TemplateStyleSettings;
  coverFields?: TemplateCoverFields;
  coverTemplate?: CoverPageTemplate;
  fonts?: string[];
}

export interface EditorSelection {
  sectionIndex: number;
  subsectionIndex: number | null;
}

export interface TemplateStructureSubsection {
  title: string;
  content?: string;
}

export interface TemplateStructureSection {
  title: string;
  content?: string;
  subsections: Array<string | TemplateStructureSubsection>;
}

export interface DocumentHeadingSizes {
  title: number;
  h1: number;
  h2: number;
  h3: number;
}

export interface DocumentMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: "in";
}

export interface DocumentPageSettings {
  size: "A4";
  widthMm: number;
  heightMm: number;
}

export interface DocumentPageBreakRules {
  heading1StartsNewPage: boolean;
}

export interface TitlePageSpacingSettings {
  logoAfterPt: number;
  eyebrowFontSizePt: number;
  eyebrowAfterPt: number;
  collegeAfterPt: number;
  titleAfterPt: number;
  studentAfterPt: number;
  courseFontSizePt: number;
  courseAfterPt: number;
  subtitleFontSizePt: number;
  subtitleBeforePt: number;
  subtitleAfterPt: number;
  noteFontSizePt: number;
  noteAfterPt: number;
}

export interface DocumentSpacingSettings {
  paragraphAfterPt: number;
  headingAfterPt: number;
  listAfterPt: number;
  quoteAfterPt: number;
  quoteIndentLeftIn: number;
  quoteIndentRightIn: number;
  codeLineHeight: number;
  codeAfterPt: number;
  tableFontSizePt: number;
  tableAfterPt: number;
  imageAfterPt: number;
  captionFontSizePt: number;
  captionAfterPt: number;
  headerFooterFontSizePt: number;
  equationAfterPt: number;
  referenceFontSizePt: number;
  referenceAfterPt: number;
  footnoteFontSizePt: number;
  footnoteAfterPt: number;
  commentAfterPt: number;
  titlePage: TitlePageSpacingSettings;
}

export interface DocumentStyleSettings {
  fontFamily: string;
  bodyFontSize: number;
  headingSizes: DocumentHeadingSizes;
  margins: DocumentMargins;
  page: DocumentPageSettings;
  pageBreakRules: DocumentPageBreakRules;
  spacing: DocumentSpacingSettings;
  heading1Size: number;
  heading2Size: number;
  heading3Size: number;
  paragraphAlign: "left" | "right" | "center" | "justify";
  lineSpacing: number;
  marginTopIn: number;
  marginBottomIn: number;
  marginLeftIn: number;
  marginRightIn: number;
  pageBreakAfterHeading1: boolean;
}

export type TemplateStyleSettings = DocumentStyleSettings;

export interface TemplateCoverFields {
  collegeName: boolean;
  studentName: boolean;
  course: boolean;
  supervisor: boolean;
  logo: boolean;
}

export interface CoverPageTemplate {
  eyebrow?: string;
  subtitle?: string;
  note?: string;
}

export interface DocumentStructureSettings {
  showCoverPage: boolean;
  showTableOfContents: boolean;
}

export interface TemplateStructure {
  name?: string;
  sections: TemplateStructureSection[];
  style?: TemplateStyleSettings;
  coverFields?: TemplateCoverFields;
  coverTemplate?: CoverPageTemplate;
  fonts?: string[];
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string;
  structure: unknown;
  created_at?: string;
}

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "header"
  | "footer"
  | "bullet_list"
  | "numbered_list"
  | "quote"
  | "code"
  | "table"
  | "image"
  | "page_break"
  | "equation"
  | "reference"
  | "footnote";

interface BaseDocumentBlock {
  id: string;
  type: BlockType;
}

export interface RichTextBlock extends BaseDocumentBlock {
  type:
    | "paragraph"
    | "heading1"
    | "heading2"
    | "heading3"
    | "header"
    | "footer"
    | "bullet_list"
    | "numbered_list"
    | "quote";
  html: string;
}

export interface CodeBlock extends BaseDocumentBlock {
  type: "code";
  code: string;
}

export interface TableBlock extends BaseDocumentBlock {
  type: "table";
  rows: string[][];
}

export interface ImageBlock extends BaseDocumentBlock {
  type: "image";
  imageId: string;
  caption: string;
  width: number;
  alignment: "left" | "center" | "right";
}

export interface PageBreakBlock extends BaseDocumentBlock {
  type: "page_break";
}

export interface EquationBlock extends BaseDocumentBlock {
  type: "equation";
  latex: string;
  label: string;
}

export interface ReferenceBlock extends BaseDocumentBlock {
  type: "reference";
  citationKey: string;
  source: string;
}

export interface FootnoteBlock extends BaseDocumentBlock {
  type: "footnote";
  footnoteKey: string;
  content: string;
}

export interface ReportComment {
  id: string;
  blockId: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

export interface TitlePageData {
  collegeName: string;
  studentName: string;
  course?: string;
  logoImageId?: string;
  logoSrc?: string;
  logoWidth: number;
  eyebrow?: string;
  subtitle?: string;
  note?: string;
  headerText?: string;
  footerText?: string;
}

export interface EditorSnapshot {
  blocks: DocumentBlock[];
  images: Record<string, ReportImage>;
  comments: ReportComment[];
  titlePage: TitlePageData;
  documentSettings: DocumentStyleSettings;
  documentStructure: DocumentStructureSettings;
  activeBlockId: string | null;
}

export interface EditorDraftData {
  templateId: string;
  title: string;
  titlePage: {
    collegeName: string;
    studentName: string;
    courseName: string;
    logoDataUrl: string;
    eyebrow: string;
    subtitle: string;
    note: string;
    headerText: string;
    footerText: string;
  };
  blocks: DocumentBlock[];
  images: Record<string, ReportImage>;
  documentSettings: DocumentStyleSettings;
  documentStructure: DocumentStructureSettings;
  compactMode: boolean;
  collapsedBlockIds: string[];
}

export interface DocumentHistoryEntry {
  id: string;
  savedAt: string;
  title: string;
  snapshot: EditorSnapshot;
}

export interface ReportRecord {
  id: string;
  user_id: string;
  title: string;
  content: EditorDraftData;
  created_at: string;
  updated_at: string;
  is_optimistic?: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string;
  college_name: string;
  default_font: string;
  created_at?: string;
  updated_at?: string;
}

export type ProfileUpdateInput = Pick<UserProfile, "full_name" | "default_font"> &
  Partial<Pick<UserProfile, "college_name">>;

export type DocumentBlock =
  | RichTextBlock
  | CodeBlock
  | TableBlock
  | ImageBlock
  | PageBreakBlock
  | EquationBlock
  | ReferenceBlock
  | FootnoteBlock;
