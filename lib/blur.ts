/**
 * 服务端 LQIP 生成（仅 Node/Sharp）
 * 用于上传时生成极小模糊图 base64，存 media.blur_data_url，供 Next/Image placeholder="blur" 使用。
 */
import sharp from 'sharp';

const LQIP_SIZE = 16;
const LQIP_QUALITY = 40;

export async function generateBlurDataURL(buffer: Buffer): Promise<string> {
  const tiny = await sharp(buffer)
    .resize(LQIP_SIZE, LQIP_SIZE, { fit: 'inside' })
    .blur()
    .toFormat('jpeg', { quality: LQIP_QUALITY })
    .toBuffer();
  return `data:image/jpeg;base64,${tiny.toString('base64')}`;
}
