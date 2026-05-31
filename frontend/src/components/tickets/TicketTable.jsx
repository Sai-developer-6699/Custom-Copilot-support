import React from 'react';
import { Badge } from '../ui/badge';
import { useTickets } from '../../contexts/TicketContext';
import { Eye } from 'lucide-react';

const TicketTable = ({ onTicketClick }) => {
  const { tickets } = useTickets();

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'p0':
      case 'high':
        return 'bg-rose-950/50 text-rose-300 border border-rose-800/40 hover:bg-rose-950/70 font-semibold';
      case 'p1':
      case 'medium':
        return 'bg-amber-950/50 text-amber-300 border border-amber-800/40 hover:bg-amber-950/70';
      case 'p2':
      case 'p3':
      case 'low':
        return 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-950/70';
      default:
        return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-800';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-950/70';
      case 'negative':
      case 'angry':
        return 'bg-rose-950/50 text-rose-300 border border-rose-800/40 hover:bg-rose-950/70';
      case 'neutral':
        return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-800';
      case 'frustrated':
        return 'bg-orange-950/50 text-orange-300 border border-orange-800/40 hover:bg-orange-950/70';
      case 'curious':
        return 'bg-sky-950/50 text-sky-300 border border-sky-800/40 hover:bg-sky-950/70';
      default:
        return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-800';
    }
  };

  // ── Empty state ──
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <div className="text-4xl animate-bounce">📋</div>
      <div className="font-semibold text-zinc-200">No tickets yet</div>
      <div className="text-xs text-zinc-500 text-center max-w-xs">
        Submit a query to generate your first ticket with AI insights
      </div>
    </div>
  );

  // ── Mobile card for each ticket ──
  const TicketCard = ({ ticket, index }) => (
    <div
      className={`rounded-xl border border-zinc-800/70 p-4 space-y-3 transition-colors duration-150 hover:bg-zinc-800/30 cursor-pointer ${
        index % 2 === 0 ? 'bg-zinc-900/20' : 'bg-zinc-950/20'
      }`}
      onClick={() => onTicketClick && onTicketClick(ticket)}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-blue-400 font-semibold">{ticket.ticketNumber}</span>
        <span className="text-[10px] text-zinc-500">#{index + 1}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[10px]">
          {ticket.topic}
        </Badge>
        <Badge variant="secondary" className={`text-[10px] ${getSentimentColor(ticket.sentiment)}`}>
          {ticket.sentiment}
        </Badge>
        <Badge variant="secondary" className={`text-[10px] ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </Badge>
      </div>

      <div className="flex items-center space-x-2 text-xs text-zinc-400">
        <span className="truncate flex-1 line-clamp-2">{ticket.response}</span>
        <Eye className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
      </div>
    </div>
  );

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-800/85 overflow-hidden">

      {/* ── Desktop / tablet table (md+) ── */}
      <div className="hidden md:block overflow-x-auto max-w-full">
        <table className="w-full min-w-max">
          <thead className="bg-zinc-950/50 border-b border-zinc-800/85 sticky top-0 z-10">
            <tr>
              {['#', 'Ticket No.', 'Topic', 'Sentiment', 'Priority', 'Response'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-zinc-400">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              tickets.map((ticket, index) => (
                <tr
                  key={ticket.id}
                  className={`transition-colors duration-150 hover:bg-zinc-800/40 ${
                    index % 2 === 0 ? 'bg-zinc-900/10' : 'bg-zinc-950/10'
                  }`}
                >
                  <td className="px-5 py-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                  <td className="px-5 py-4 text-sm font-mono text-blue-400 font-semibold">{ticket.ticketNumber}</td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary" className="bg-blue-950/40 text-blue-300 border border-blue-800/40 hover:bg-blue-950/70 transition-colors">
                      {ticket.topic}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary" className={`transition-colors ${getSentimentColor(ticket.sentiment)}`}>
                      {ticket.sentiment}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary" className={`transition-colors ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td
                    className="px-5 py-4 text-sm text-zinc-300 max-w-xs cursor-pointer group"
                    onClick={() => onTicketClick && onTicketClick(ticket)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="truncate flex-1 group-hover:text-blue-300 transition-colors">{ticket.response}</span>
                      <Eye className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden">
        {tickets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-3 space-y-2">
            {tickets.map((ticket, index) => (
              <TicketCard key={ticket.id} ticket={ticket} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketTable;