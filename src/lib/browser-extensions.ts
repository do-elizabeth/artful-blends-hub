export const MONITORED_EXTENSION_IDS = [
  "nkbihfbeogaeaoehlefnkodbefgpgknn",
  "ejbalbakoplchlghecdalmeeeajnimhm",
  "fhbohimaelbohpjbbldcngcnapndodjp",
  "ibnejdfjmmkpcnlpebklmnkoeoihofec",
  "bfnaelmomeimhlpmgjnjophhpkkoljpa",
  "aeachknmefphepccionboohckonoeemg",
  "hifafgmccdpekplomjjkcfgodnhcellj",
  "jblndlipeogpafnldhgmapagcccfchpi",
  "acmacodkjbdgmoleebolmdjonilkdbch",
  "dlcobpjiigpikoobohmabehhmhfoodbb",
  "mcohilncbfahbmgdjkbpemcciiolgcge",
  "agoakfejjabomempkjlepdflaleeobhb",
  "omaabbefbmiijedngplfjmnooppbclkk",
  "aholpfdialjgjfhomihkjbmgjidlcdno",
  "nphplpgoakhhjchkkhmiggakijnkhfnd",
  "penjlddjkjgpnkllboccdgccekpkcbin",
  "lgmpcpglpngdoalbgeoldeajfclnhafa",
  "fldfpgipfncgndfolcbkdeeknbbbnhcc",
  "bhhhlbepdkbapadjdnnojkbgioiodbic",
  "gjnckgkfmgmibbkoficdidcljeaaaheg",
  "afbcbjpbpfadlkmhmclhkeeodmamcflc",
  "egjidjbpglichdcondbcbdnbeeppgdph",
] as const;

export type ExtensionDetectionStatus = "detected" | "not-detected" | "unknown";

export type ExtensionDetectionResult = {
  id: string;
  status: ExtensionDetectionStatus;
};

type ExtensionRuntime = {
  sendMessage?: (
    extensionId: string,
    message: { type: "hearth-extension-presence" },
    callback?: (response?: { installed?: boolean }) => void,
  ) => void;
};

function getExtensionRuntime(): ExtensionRuntime | null {
  const candidate = (globalThis as { chrome?: { runtime?: ExtensionRuntime } }).chrome?.runtime;
  return candidate ?? null;
}

function probeExtension(id: string): Promise<ExtensionDetectionResult> {
  const runtime = getExtensionRuntime();
  if (!runtime?.sendMessage) return Promise.resolve({ id, status: "unknown" });

  return new Promise((resolve) => {
    let finished = false;
    const finish = (status: ExtensionDetectionStatus) => {
      if (finished) return;
      finished = true;
      resolve({ id, status });
    };

    const timer = window.setTimeout(() => finish("unknown"), 500);
    try {
      runtime.sendMessage(id, { type: "hearth-extension-presence" }, (response) => {
        window.clearTimeout(timer);
        finish(response?.installed === true ? "detected" : "unknown");
      });
    } catch {
      window.clearTimeout(timer);
      finish("unknown");
    }
  });
}

export async function detectMonitoredExtensions(): Promise<ExtensionDetectionResult[]> {
  return Promise.all(MONITORED_EXTENSION_IDS.map(probeExtension));
}
