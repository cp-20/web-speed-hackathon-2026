async function parseJSONResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}

export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  return await response.arrayBuffer();
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
  });
  return parseJSONResponse<T>(response);
}

export async function sendFile<T>(url: string, file: File): Promise<T> {
  if (typeof CompressionStream === "undefined") {
    const response = await fetch(url, {
      body: file,
      headers: {
        "Content-Type": "application/octet-stream",
      },
      method: "POST",
    });
    return parseJSONResponse<T>(response);
  }

  const compressedBody = file.stream().pipeThrough(
    new CompressionStream("gzip"),
  );

  const response = await fetch(
    url,
    {
      body: compressedBody,
      duplex: "half",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "gzip",
        "X-Original-Content-Type": file.type || "application/octet-stream",
      },
      method: "POST",
    } as RequestInit & { duplex: "half" },
  );
  return parseJSONResponse<T>(response);
}

export async function sendJSON<T>(url: string, data: object): Promise<T> {
  const jsonString = JSON.stringify(data);

  const response = await fetch(url, {
    body: jsonString,
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw { responseJSON: await response.json() };
  }

  return parseJSONResponse<T>(response);
}
