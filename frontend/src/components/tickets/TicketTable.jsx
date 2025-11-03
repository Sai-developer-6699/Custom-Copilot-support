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
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'p1':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'p2':
      case 'p3':
      case 'low':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'neutral':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Serial No.
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ticket Number
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Topic
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sentiment
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Response
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-4xl">📋</div>
                    <div>No tickets yet</div>
                    <div className="text-sm">Submit a query to create your first ticket</div>
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map((ticket, index) => (
                <tr 
                  key={ticket.id}
                  className={`transition-colors duration-150 hover:bg-blue-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-blue-600 font-medium">
                    {ticket.ticketNumber}
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant="secondary" 
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors duration-150"
                    >
                      {ticket.topic}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant="secondary" 
                      className={`transition-colors duration-150 ${getSentimentColor(ticket.sentiment)}`}
                    >
                      {ticket.sentiment}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant="secondary" 
                      className={`transition-colors duration-150 ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-600 max-w-xs cursor-pointer group"
                    onClick={() => onTicketClick && onTicketClick(ticket)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="truncate flex-1">
                        {ticket.response}
                      </span>
                      <Eye className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketTable;