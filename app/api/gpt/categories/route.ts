import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  depth: number | null;
  path: string | null;
}

function buildBreadcrumb(category: CategoryRow, byId: Map<string, CategoryRow>): string {
  const names: string[] = [];
  let current: CategoryRow | undefined = category;
  const seen = new Set<string>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }

  return names.join(' / ');
}

export async function GET(request: NextRequest) {
  console.log("[GPT ping] /categories", {
    time: new Date().toISOString(),
    ua: request.headers.get("user-agent"),
    authPrefix: request.headers.get("authorization")?.slice(0, 25),
    ip: request.headers.get("x-forwarded-for") || (request as any).ip || "unknown",
  });

  try {
    const auth = authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const categories = await query<CategoryRow[]>(
      `SELECT id, name, parent_id, order_index, depth, path
       FROM categories
       ORDER BY COALESCE(path, ''), order_index ASC, name ASC`
    );

    const byId = new Map(categories.map(category => [category.id, category]));

    const options = categories.map(category => ({
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      depth: category.depth ?? (category.path ? category.path.split('-').length : 1),
      path: category.path || '',
      breadcrumb: buildBreadcrumb(category, byId),
    }));

    return NextResponse.json({
      success: true,
      count: options.length,
      categories: options,
      hint: 'Choose category_id by breadcrumb. Omit category_id if uncertain - article goes to default category.',
    });
  } catch (error: any) {
    console.error('[GPT Categories] fetch failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
