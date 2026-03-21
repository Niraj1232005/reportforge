import type { ReportSection, ReportSubsection, ReportTemplate } from "@/types/editor";
import { DEFAULT_DOCUMENT_SETTINGS, DEFAULT_FONT_LIBRARY } from "@/lib/document-settings";

const cloneSubsection = (subsection: ReportSubsection): ReportSubsection => ({
  ...subsection,
  images: [...(subsection.images ?? [])],
});

const cloneSection = (section: ReportSection): ReportSection => ({
  ...section,
  images: [...(section.images ?? [])],
  subsections: section.subsections.map(cloneSubsection),
});

export const templates: ReportTemplate[] = [
  {
    id: "research-report",
    name: "Research Report",
    description: "Academic format for formal research writing.",
    style: { ...DEFAULT_DOCUMENT_SETTINGS },
    coverTemplate: {
      eyebrow: "Academic Report",
      subtitle: "Formal research structure with polished export-ready pages.",
      note: "",
    },
    fonts: [...DEFAULT_FONT_LIBRARY],
    sections: [
      {
        id: "research-abstract",
        title: "Abstract",
        content: "",
        subsections: [],
      },
      {
        id: "research-introduction",
        title: "Introduction",
        content: "",
        subsections: [
          { id: "research-intro-background", title: "Background", content: "" },
          {
            id: "research-intro-problem",
            title: "Problem Statement",
            content: "",
          },
          { id: "research-intro-objectives", title: "Objectives", content: "" },
        ],
      },
      {
        id: "research-literature",
        title: "Literature Review",
        content: "",
        subsections: [
          { id: "research-lit-prior-work", title: "Prior Work", content: "" },
          { id: "research-lit-gap", title: "Research Gap", content: "" },
        ],
      },
      {
        id: "research-method",
        title: "Methodology",
        content: "",
        subsections: [
          { id: "research-method-data", title: "Data Collection", content: "" },
          {
            id: "research-method-analysis",
            title: "Analysis Approach",
            content: "",
          },
        ],
      },
      {
        id: "research-results",
        title: "Results",
        content: "",
        subsections: [],
      },
      {
        id: "research-conclusion",
        title: "Conclusion",
        content: "",
        subsections: [],
      },
    ],
  },
  {
    id: "lab-report",
    name: "Lab Report",
    description: "Classic experiment structure with observations and results.",
    style: { ...DEFAULT_DOCUMENT_SETTINGS },
    coverTemplate: {
      eyebrow: "Lab Submission",
      subtitle: "Document experiments with clean structure, figures, and results.",
      note: "",
    },
    fonts: [...DEFAULT_FONT_LIBRARY],
    sections: [
      {
        id: "lab-objective",
        title: "Objective",
        content: "",
        subsections: [],
      },
      {
        id: "lab-theory",
        title: "Theory",
        content: "",
        subsections: [],
      },
      {
        id: "lab-procedure",
        title: "Procedure",
        content: "",
        subsections: [
          { id: "lab-materials", title: "Materials", content: "" },
          { id: "lab-steps", title: "Steps", content: "" },
        ],
      },
      {
        id: "lab-observations",
        title: "Observations",
        content: "",
        subsections: [],
      },
      {
        id: "lab-result",
        title: "Result",
        content: "",
        subsections: [],
      },
      {
        id: "lab-conclusion",
        title: "Conclusion",
        content: "",
        subsections: [],
      },
    ],
  },
  {
    id: "project-report",
    name: "Project Report",
    description: "Practical documentation for system implementation work.",
    style: { ...DEFAULT_DOCUMENT_SETTINGS },
    coverTemplate: {
      eyebrow: "Project Documentation",
      subtitle: "A flexible structure for implementation details, design, and validation.",
      note: "",
    },
    fonts: [...DEFAULT_FONT_LIBRARY],
    sections: [
      {
        id: "project-summary",
        title: "Executive Summary",
        content: "",
        subsections: [],
      },
      {
        id: "project-requirements",
        title: "Requirements",
        content: "",
        subsections: [
          { id: "project-functional", title: "Functional Requirements", content: "" },
          {
            id: "project-non-functional",
            title: "Non-Functional Requirements",
            content: "",
          },
        ],
      },
      {
        id: "project-design",
        title: "System Design",
        content: "",
        subsections: [
          { id: "project-architecture", title: "Architecture", content: "" },
          { id: "project-components", title: "Components", content: "" },
        ],
      },
      {
        id: "project-implementation",
        title: "Implementation",
        content: "",
        subsections: [
          { id: "project-workflow", title: "Workflow", content: "" },
          { id: "project-tools", title: "Tools and Stack", content: "" },
        ],
      },
      {
        id: "project-testing",
        title: "Testing and Validation",
        content: "",
        subsections: [],
      },
      {
        id: "project-conclusion",
        title: "Conclusion and Future Work",
        content: "",
        subsections: [],
      },
    ],
  },
  {
    id: "assignment",
    name: "Assignment",
    description: "Course assignment template with analysis and references.",
    style: { ...DEFAULT_DOCUMENT_SETTINGS },
    coverTemplate: {
      eyebrow: "Course Submission",
      subtitle: "A concise assignment layout for structured thinking and review.",
      note: "",
    },
    fonts: [...DEFAULT_FONT_LIBRARY],
    sections: [
      {
        id: "assignment-cover",
        title: "Assignment Overview",
        content: "",
        subsections: [],
      },
      {
        id: "assignment-introduction",
        title: "Introduction",
        content: "",
        subsections: [
          { id: "assignment-context", title: "Context", content: "" },
          { id: "assignment-goals", title: "Goals", content: "" },
        ],
      },
      {
        id: "assignment-solution",
        title: "Proposed Solution",
        content: "",
        subsections: [
          { id: "assignment-approach", title: "Approach", content: "" },
          { id: "assignment-implementation", title: "Implementation", content: "" },
        ],
      },
      {
        id: "assignment-analysis",
        title: "Analysis",
        content: "",
        subsections: [
          { id: "assignment-results", title: "Results", content: "" },
          { id: "assignment-discussion", title: "Discussion", content: "" },
        ],
      },
      {
        id: "assignment-conclusion",
        title: "Conclusion",
        content: "",
        subsections: [],
      },
      {
        id: "assignment-references",
        title: "References",
        content: "",
        subsections: [],
      },
    ],
  },
];

export const getTemplates = (): ReportTemplate[] => templates;

export const getTemplateById = (templateId: string): ReportTemplate | null => {
  return templates.find((template) => template.id === templateId) ?? null;
};

export const getTemplateSections = (templateId: string): ReportSection[] => {
  const template = getTemplateById(templateId);

  if (!template) {
    return [];
  }

  return template.sections.map(cloneSection);
};
