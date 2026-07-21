import { useMemo } from 'react';
import { componentDefinitionMap } from '../../domain/components/definitions';
import { createTemplateDocument } from '../../domain/learning/content';
import type { ArchitectureDocumentV1 } from '../../domain/architecture/types';

export function ArchitecturePreview({
  templateId,
  reference = false,
  architecture,
}: {
  templateId: string;
  reference?: boolean;
  architecture?: ArchitectureDocumentV1;
}) {
  const generated = useMemo(
    () => createTemplateDocument(templateId, reference),
    [reference, templateId],
  );
  const document = architecture ?? generated;
  const bounds = document.nodes.reduce(
    (result, node) => ({
      maxX: Math.max(result.maxX, node.position.x),
      maxY: Math.max(result.maxY, node.position.y),
    }),
    { maxX: 1, maxY: 1 },
  );
  const position = (id: string) =>
    document.nodes.find((node) => node.id === id)?.position;
  return (
    <svg
      className="architecture-preview"
      viewBox={`-20 -20 ${bounds.maxX + 210} ${bounds.maxY + 100}`}
      role="img"
      aria-label={`${document.metadata.name} architecture preview`}
    >
      {document.edges.map((edge) => {
        const source = position(edge.source);
        const target = position(edge.target);
        return source && target ? (
          <line
            key={edge.id}
            x1={source.x + 60}
            y1={source.y + 20}
            x2={target.x + 60}
            y2={target.y + 20}
          />
        ) : null;
      })}
      {document.nodes.map((node) => (
        <g
          key={node.id}
          transform={`translate(${node.position.x} ${node.position.y})`}
        >
          <rect
            width="120"
            height="40"
            rx="8"
            fill={componentDefinitionMap[node.type].color}
          />
          <text x="60" y="24" textAnchor="middle">
            {node.data.label.slice(0, 18)}
          </text>
        </g>
      ))}
    </svg>
  );
}
