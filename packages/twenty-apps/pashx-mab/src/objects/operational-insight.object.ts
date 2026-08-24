import {
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.operationalInsight,
  nameSingular: 'operationalInsight',
  namePlural: 'operationalInsights',
  labelSingular: 'Operational insight',
  labelPlural: 'Operational insights',
  description: 'Versioned evidence-linked observation or suggestion.',
  icon: 'IconBulb',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight,
  fields: [
    { universalIdentifier: PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight, type: FieldType.TEXT, name: 'name', label: 'Insight', description: 'Short evidence-backed insight title.', icon: 'IconAbc' },
    {
      universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.insightType,
      type: FieldType.SELECT, name: 'insightType', label: 'Insight type', description: 'Presentation category, not workflow truth.', icon: 'IconCategory',
      options: [
        ['observation', 'OBSERVATION', 'Observation', 'orange'], ['suggestion', 'SUGGESTION', 'Suggestion', 'green'], ['dataQuality', 'DATA_QUALITY', 'Data quality', 'red'],
      ].map(([key, value, label, color], position) => ({ id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.operationalInsight.insightType[key as keyof typeof PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.operationalInsight.insightType], value, label, color, position })),
    },
    { universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.lifecycleStatus, type: FieldType.TEXT, name: 'lifecycleStatus', label: 'Lifecycle', description: 'ACTIVE, DISMISSED, or SUPERSEDED.', icon: 'IconProgress' },
    { universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.narrative, type: FieldType.TEXT, name: 'narrative', label: 'Narrative', description: 'Evidence-backed generated or deterministic explanation.', icon: 'IconNotes' },
    { universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.sourceRecordIds, type: FieldType.RAW_JSON, name: 'sourceRecordIds', label: 'Source record IDs', description: 'Evidence records supporting the insight.', icon: 'IconListDetails' },
    { universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.generatorVersion, type: FieldType.TEXT, name: 'generatorVersion', label: 'Generator version', description: 'Rule or agent version that produced the insight.', icon: 'IconVersions' },
    { universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.generatedAt, type: FieldType.DATE_TIME, name: 'generatedAt', label: 'Generated at', description: 'Time the insight was produced.', icon: 'IconCalendarTime' },
    { universalIdentifier: PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.operationalInsight.confidence, type: FieldType.TEXT, name: 'confidence', label: 'Confidence', description: 'LOW, MEDIUM, or HIGH evidence confidence.', icon: 'IconChartDots' },
  ],
});
