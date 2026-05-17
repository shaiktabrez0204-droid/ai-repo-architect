import type { ArchitectureReport } from "@/lib/shared/analysis-types";
import type { RepositoryProfile } from "@/lib/shared/repository-profile-types";
import { CodeSmellList } from "./code-smell-list";
import { DependencyAnalysisView } from "./dependency-analysis-view";
import { FolderExplanationList } from "./folder-explanation-list";
import { MarkdownPreview } from "./markdown-preview";
import { RecommendationList } from "./recommendation-list";
import { ReportCard } from "./report-card";

interface AnalysisReportProps {
  report: ArchitectureReport;
  profile: RepositoryProfile;
}

export function AnalysisReport({ report, profile }: AnalysisReportProps) {
  return (
    <div className="space-y-4">
      <ReportCard
        title="Architecture Overview"
        description="Model summary grounded in deterministic repository profiling."
      >
        <div className="prose-lite text-zinc-300">
          <p>{report.architectureOverview}</p>
        </div>
      </ReportCard>

      <ReportCard
        title="Dependency Analysis"
        description="Runtime and development dependency observations."
      >
        <DependencyAnalysisView analysis={report.dependencyAnalysis} />
      </ReportCard>

      <ReportCard
        title="Folder Explanations"
        description="Major folders detected from the repository file tree."
      >
        <FolderExplanationList folders={report.folderExplanations} />
      </ReportCard>

      <ReportCard
        title="Code Smell Observations"
        description="Maintainability risks with observed or inferred evidence."
      >
        <CodeSmellList observations={report.codeSmells} />
      </ReportCard>

      <ReportCard
        title="Prioritized Recommendations"
        description="Practical next steps based on the repository profile."
      >
        <RecommendationList recommendations={report.recommendations} />
      </ReportCard>

      <ReportCard
        title="Generated README"
        description={`Professional README draft for ${profile.metadata.repository.owner}/${profile.metadata.repository.name}.`}
        defaultOpen={false}
      >
        <MarkdownPreview markdown={report.professionalReadme} />
      </ReportCard>
    </div>
  );
}
