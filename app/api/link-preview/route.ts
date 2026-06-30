import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'No url' }, { status: 400 });

  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)' } 
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const data = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || url,
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null,
      url,
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ title: url, description: '', image: null, url });
  }
}