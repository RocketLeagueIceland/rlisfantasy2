'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, Medal, ArrowUp, ArrowDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, isSafeUrl } from '@/lib/utils';
import type { ScoreboardEntry } from '@/types';

type SortColumn = 'total' | number;

interface LeaderboardTableProps {
  entries: ScoreboardEntry[];
  showWeeklyBreakdown?: boolean;
}

export function LeaderboardTable({
  entries,
  showWeeklyBreakdown = false,
}: LeaderboardTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'desc' ? (
      <ArrowDown className="h-3 w-3 inline ml-1" />
    ) : (
      <ArrowUp className="h-3 w-3 inline ml-1" />
    );
  };
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground">{rank}</span>;
    }
  };

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat('is-IS').format(points);
  };

  // Get all unique weeks
  const allWeeks = entries.length > 0
    ? [...new Set(entries.flatMap((e) => e.weekly_points.map((w) => w.week_number)))].sort(
        (a, b) => a - b
      )
    : [];

  const sortedEntries = useMemo(() => {
    if (sortColumn === 'total' && sortDirection === 'desc') {
      return entries;
    }

    const sorted = [...entries].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortColumn === 'total') {
        aVal = a.total_points;
        bVal = b.total_points;
      } else {
        aVal = a.weekly_points.find((w) => w.week_number === sortColumn)?.points ?? 0;
        bVal = b.weekly_points.find((w) => w.week_number === sortColumn)?.points ?? 0;
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [entries, sortColumn, sortDirection]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Team</TableHead>
          <TableHead
            className="text-right cursor-pointer hover:text-foreground select-none"
            onClick={() => handleSort('total')}
          >
            Total Points
            <SortIcon column="total" />
          </TableHead>
          {showWeeklyBreakdown &&
            allWeeks.map((week) => (
              <TableHead
                key={week}
                className="text-right w-20 cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort(week)}
              >
                W{week}
                <SortIcon column={week} />
              </TableHead>
            ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedEntries.map((entry) => (
          <TableRow
            key={entry.user_id}
            className={cn(
              entry.rank <= 3 && 'bg-muted/30'
            )}
          >
            <TableCell className="font-medium">
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(entry.rank)}
              </div>
            </TableCell>
            <TableCell>
              <Link
                href={`/user/${encodeURIComponent(entry.username)}`}
                className="flex items-center gap-3 hover:underline"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={isSafeUrl(entry.avatar_url)} />
                  <AvatarFallback>
                    {entry.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{entry.team_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.username}
                  </div>
                </div>
              </Link>
            </TableCell>
            <TableCell className="text-right font-bold text-lg">
              {formatPoints(entry.total_points)}
            </TableCell>
            {showWeeklyBreakdown &&
              allWeeks.map((week) => {
                const weekPoints = entry.weekly_points.find(
                  (w) => w.week_number === week
                );
                return (
                  <TableCell key={week} className="text-right text-sm">
                    {weekPoints ? formatPoints(weekPoints.points) : '-'}
                  </TableCell>
                );
              })}
          </TableRow>
        ))}
        {entries.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={showWeeklyBreakdown ? 3 + allWeeks.length : 3}
              className="text-center text-muted-foreground py-8"
            >
              No teams yet
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
