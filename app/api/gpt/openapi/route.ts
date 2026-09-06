import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("[GPT ping] /openapi", {
    time: new Date().toISOString(),
    ua: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for") || (request as any).ip || "unknown",
  });

  const host = request.headers.get('host') || 'localhost';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}/api/gpt`;

  const yaml = `openapi: 3.1.0
info:
  title: Fishbowl GPT Publish API
  version: 3.1.0
  description: |
    ChatGPT publishes organized conversation summaries to Fishbowl.
    The GPT sends intent-level fields and ordered blocks. The server owns ids,
    author, published status, access levels, media records, block order, and tags.
servers:
  - url: ${baseUrl}
security:
  - BearerAuth: []
paths:
  /categories:
    get:
      operationId: getCategories
      summary: Get selectable existing category branches.
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CategoriesResponse"
  /moments:
    post:
      operationId: saveConversationMoment
      summary: Save a summarized conversation page as an article with blocks.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/MomentCreateRequest"
      responses:
        "200":
          description: Saved successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MomentCreateResponse"
        "400":
          description: Invalid request
        "401":
          description: Unauthorized
  /publish:
    post:
      operationId: publishArticle
      summary: Publish an article with the same block-based contract as moments.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/MomentCreateRequest"
      responses:
        "200":
          description: Published successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MomentCreateResponse"
  /upload:
    post:
      operationId: uploadImage
      summary: Upload an image as base64 and get a URL usable in image blocks.
      description: |
        Use this when the image has no publicly reachable URL - for example a picture
        the user attached in the conversation. Upload it here first, then put the
        returned "fullUrl" into an image block of publishArticle or saveConversationMoment.
        Images that already live on a public http(s) URL do not need this step; the
        publish endpoints download those on their own.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UploadRequest"
      responses:
        "200":
          description: Uploaded successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UploadResponse"
        "400":
          description: Invalid base64, unsupported image type, or file too large
        "401":
          description: Unauthorized
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: GPT_PUBLISH_TOKEN from environment variable
  schemas:
    CategoryOption:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        parent_id:
          type: string
          nullable: true
        depth:
          type: integer
        path:
          type: string
          description: Server-maintained sorting path. Do not calculate this.
        breadcrumb:
          type: string
          description: Human-readable category path. Choose category_id by this field. Omit category_id if uncertain.
    CategoriesResponse:
      type: object
      properties:
        success:
          type: boolean
        count:
          type: integer
        categories:
          type: array
          items:
            $ref: "#/components/schemas/CategoryOption"
    MomentCreateRequest:
      type: object
      required:
        - title
        - moment_type
        - article_type
        - summary
        - blocks
      properties:
        title:
          type: string
          maxLength: 255
        moment_type:
          type: string
          description: Semantic type of the saved conversation. Stored by server as a moment:* tag.
          enum:
            - brainwave
            - knowledge
            - story_seed
            - dev_note
            - debug_note
            - life_note
            - quote
            - mixed
        article_type:
          type: string
          description: Must match the articles.type enum. Use code for dev/debug notes.
          enum:
            - default
            - text
            - image
            - code
            - diary
            - drawing
        summary:
          type: string
          description: One-paragraph summary or excerpt.
        excerpt:
          type: string
          nullable: true
        category_id:
          type: string
          nullable: true
          description: Existing category id from getCategories. Omit if unsure.
        tags:
          type: array
          items:
            type: string
          maxItems: 10
        blocks:
          type: array
          minItems: 1
          items:
            $ref: "#/components/schemas/ContentBlockInput"
    ContentBlockInput:
      type: object
      required:
        - type
      properties:
        type:
          type: string
          enum:
            - text
            - code
            - image
        content:
          type: string
          nullable: true
          description: Text body, code body, or optional image caption.
        language:
          type: string
          nullable: true
          description: Optional language for code blocks.
        image:
          $ref: "#/components/schemas/ImageInput"
    ImageInput:
      type: object
      properties:
        url:
          type: string
          description: |
            Prefer the "fullUrl" returned by uploadImage. Any public http(s) URL also
            works - the server downloads it and creates a media record. The relative
            "url" from uploadImage is accepted too. Use uploadImage for pictures the
            user attached in the conversation, since those have no public URL.
        name:
          type: string
        description:
          type: string
          nullable: true
    UploadRequest:
      type: object
      required:
        - base64
      properties:
        base64:
          type: string
          description: |
            Image as a data URL: data:image/png;base64,<payload>
            Supported types: image/jpeg, image/png, image/webp, image/gif.
            Max 5MB after decoding.
        filename:
          type: string
          description: Optional file name. The server generates one when omitted.
        title:
          type: string
        description:
          type: string
    UploadResponse:
      type: object
      properties:
        success:
          type: boolean
        url:
          type: string
          description: Site-relative path, e.g. /uploads/2026/09/xxx.png. Put this into an image block.
        fullUrl:
          type: string
          description: Absolute URL of the same file.
        media_id:
          type: string
        filename:
          type: string
        mimeType:
          type: string
        sizeBytes:
          type: integer
        width:
          type: integer
        height:
          type: integer
        aspect_ratio:
          type: number
    MomentCreateResponse:
      type: object
      properties:
        success:
          type: boolean
        article_id:
          type: string
        url:
          type: string
        message:
          type: string
        category_id:
          type: string
        article_type:
          type: string
        tags:
          type: array
          items:
            type: string
        blockCount:
          type: integer
        imageCount:
          type: integer
`;

  return new NextResponse(yaml, {
    headers: {
      'Content-Type': 'application/x-yaml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
