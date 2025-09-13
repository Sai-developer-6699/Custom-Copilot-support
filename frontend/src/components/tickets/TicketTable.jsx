import React from 'react';
import { Badge } from '../ui/badge';
import { mockTickets } from '../../data/mockData';

const TicketTable = () => {
  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
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
            {mockTickets.map((ticket, index) => (
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
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {ticket.response}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketTable;