export async function previewFetch(url, options = {}) {
  const endpoint = new URL(url, window.location.href);
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'POST') return fetch(url, options);

  const chatEndpoint = new URL(
    import.meta.env.VITE_CHAT_ENDPOINT || '/api/chat',
    window.location.href
  );

  if (endpoint.href === chatEndpoint.href) {
    const { message, history = [] } = JSON.parse(options.body);
    const historique = history
      .filter(item => item && ['user', 'assistant'].includes(item.role))
      .map(item => ({
        role: item.role,
        content: String(item.content ?? item.text ?? '').slice(0, 2000)
      }))
      .filter(item => item.content)
      .slice(-6);

    const response = await fetch(url, {
      ...options,
      body: JSON.stringify({ message, historique })
    });

    if (!response.ok) return response;
    const data = await response.json();
    return Response.json({ answer: data.reponse });
  }

  if (!endpoint.pathname.replace(/\/$/, '').endsWith('/route')) {
    return fetch(url, options);
  }

  const { mode, coordinates } = JSON.parse(options.body);
  if (mode !== 'driving') {
    return Response.json(
      { detail: 'Le calcul est disponible uniquement en voiture.' },
      { status: 422 }
    );
  }

  const points = [];
  let distance = 0;
  let duration = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const [from_lng, from_lat] = coordinates[i - 1];
    const [to_lng, to_lat] = coordinates[i];
    const leg = new URL(endpoint);
    leg.search = new URLSearchParams({ from_lat, from_lng, to_lat, to_lng });

    const response = await fetch(leg, { signal: options.signal });
    if (!response.ok) return response;

    const data = await response.json();
    const segment = data.geometry.coordinates;

    for (const [lng, lat] of segment) {
      const last = points[points.length - 1];
      if (!last || last[0] !== lng || last[1] !== lat) points.push([lng, lat]);
    }

    distance += data.distance_m;
    duration += data.duree_s;
  }

  return Response.json({
    geometry: { type: 'LineString', coordinates: points },
    distance,
    duration
  });
}
