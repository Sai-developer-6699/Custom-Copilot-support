import React from 'react';
import { ExternalLink } from 'lucide-react';

const SourceCard = ({ source }) => {
  const chunk = source?.chunk || source?.text || source?.content || source?.source || '';
  const docTitle = source?.doc_title || source?.title || source?.name || 'Source';
  const docUrl = source?.doc_url || source?.url || (typeof source?.source === 'string' && source.source.startsWith('http') ? source.source : null);
  const score = source?.relevance_score ?? source?.score ?? source?.relevance ?? null;

  const hasUrl = !!docUrl;

  // Format score for display: if between 0 and 1 show percent, otherwise numeric with 2 decimals
  let displayScore = null;
  if (typeof score === 'number' && !Number.isNaN(score)) {
    if (score >= 0 && score <= 1) displayScore = `${(score * 100).toFixed(2)}%`;
    else displayScore = score.toFixed(2);
  }

  const container = (
    <div
      role="article"
      aria-label={`Source: ${docTitle}`}
      className="group relative rounded-lg border border-slate-200 bg-white/60 p-3 hover:shadow-xl hover:scale-[1.01] transition-transform duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 mb-1 truncate">{docTitle}</div>
          <div className="text-sm text-slate-700 line-clamp-3">{chunk}</div>
        </div>

        {displayScore != null && (
          <div className="ml-3 flex flex-col items-end">
            <div className="px-2 py-0.5 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white text-xs font-semibold">
              {displayScore}
            </div>
            <div className="mt-1 text-xs text-slate-400">score</div>
          </div>
        )}
      </div>

      {hasUrl && (
        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </div>
      )}
    </div>
  );

  return hasUrl ? (
    <a href={docUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${docTitle} in new tab`} className="block">
      {container}
    </a>
  ) : (
    <div className="block">{container}</div>
  );
};

export default SourceCard;
