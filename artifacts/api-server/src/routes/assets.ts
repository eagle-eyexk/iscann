import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  ArchiveAssetParams,
  CreateAssetBody,
  ListAssetsResponse,
  ListAssetsResponseItem,
} from "@workspace/api-zod";
import { assetsTable, db } from "@workspace/db";
import { isPublicHost, normalizeUrl } from "../lib/scanner";
import {
  getAuthenticatedUserId,
  requireAuth,
} from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/assets", async (_req, res): Promise<void> => {
  const ownerId = getAuthenticatedUserId(res);
  const rows = await db
    .select({
      id: assetsTable.id,
      name: assetsTable.name,
      url: assetsTable.url,
      host: assetsTable.host,
      createdAt: assetsTable.createdAt,
      lastScannedAt: assetsTable.lastScannedAt,
    })
    .from(assetsTable)
    .where(and(eq(assetsTable.ownerId, ownerId), isNull(assetsTable.archivedAt)))
    .orderBy(desc(assetsTable.createdAt));

  res.json(ListAssetsResponse.parse(rows));
});

router.post("/assets", async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.authorizationConfirmed) {
    res.status(400).json({
      error: "Confirm that you own or are authorized to assess this website.",
    });
    return;
  }

  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Asset name cannot be blank." });
    return;
  }

  let normalizedUrl: string;
  let host: string;
  try {
    normalizedUrl = normalizeUrl(parsed.data.url);
    const target = new URL(normalizedUrl);
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password ||
      !isPublicHost(target.hostname)
    ) {
      res.status(400).json({
        error: "Only public http(s) websites without embedded credentials are supported.",
      });
      return;
    }
    host = target.hostname.toLowerCase();
  } catch {
    res.status(400).json({ error: "Enter a valid public website address." });
    return;
  }

  const ownerId = getAuthenticatedUserId(res);
  const [created] = await db
    .insert(assetsTable)
    .values({
      ownerId,
      name,
      url: normalizedUrl,
      host,
      authorizationConfirmed: true,
    })
    .onConflictDoNothing()
    .returning({
      id: assetsTable.id,
      name: assetsTable.name,
      url: assetsTable.url,
      host: assetsTable.host,
      createdAt: assetsTable.createdAt,
      lastScannedAt: assetsTable.lastScannedAt,
    });

  if (!created) {
    res.status(409).json({ error: "This website is already in your asset list." });
    return;
  }

  req.log.info({ host }, "Authorized website asset created");
  res.status(201).json(ListAssetsResponseItem.parse(created));
});

router.post("/assets/:id/archive", async (req, res): Promise<void> => {
  const parsed = ArchiveAssetParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ownerId = getAuthenticatedUserId(res);
  const [archived] = await db
    .update(assetsTable)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(assetsTable.id, parsed.data.id),
        eq(assetsTable.ownerId, ownerId),
        isNull(assetsTable.archivedAt),
      ),
    )
    .returning({ id: assetsTable.id });

  if (!archived) {
    res.status(404).json({ error: "Asset not found." });
    return;
  }
  res.status(204).end();
});

export default router;
