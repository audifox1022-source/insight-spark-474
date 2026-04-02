interface TableProps {
  data: any;
}

export const TableRenderer: React.FC<TableProps> = ({ data }) => {
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
      <p className="font-bold">데이터가 없습니다.</p>
    </div>
  );

  // 데이터 구조 정규화
  let columns: string[] = [];
  let rows: any[][] = [];

  if (data.columns && Array.isArray(data.rows)) {
    // [Phase 10] 새 구조 지원: { columns: [], rows: [[]] }
    columns = data.columns;
    rows = data.rows;
  } else if (Array.isArray(data) && data.length > 0) {
    // [하위 호환] 이전 구조 지원: [{ label, value }, ...]
    columns = Object.keys(data[0]).filter(key => key !== 'id');
    rows = data.map(obj => columns.map(col => obj[col]));
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="font-black text-xl mb-2">테이블 데이터 분석 중</p>
        <p className="text-sm font-medium">유효한 데이터 구조를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100">
        <div className="overflow-x-auto custom-scrollbar-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900">
                {columns.map((col, idx) => (
                  <th key={idx} className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-8 py-5 text-lg font-bold text-slate-700 tracking-tight group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                      {String(cell || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
