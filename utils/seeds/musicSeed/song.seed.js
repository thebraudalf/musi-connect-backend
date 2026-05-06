import { request } from "undici";

/**
 * @function `searchaSong`
 * Performs a global search for songs based on a text query.
 * - Uses 'encodeURIComponent' to ensure special characters in song names don't break the URL.
 * - Fetches data using 'undici', a high-performance HTTP client for Node.js.
 * - Returns an array of song result objects from the 'data.results' path.
 */
async function searchaSong(songName, limit) {
  // Check if songName exists and is a string
  if (!songName || typeof songName !== "string") {
    throw new Error("Invalid song name provided to searchaSong");
  }

  try {
    const query = encodeURIComponent(songName.toLowerCase().trim());
    const { body } = await request(
      `https://jiosaavn-api-wbnc.vercel.app/api/search/songs?query=${query}&limit=${limit}`,
    );

    //console.log(songName.toLowerCase().replaceAll(" ", "-"));
    const getSong = await body.json();

    //console.log(result.data.results);
    return getSong.data.results;
  } catch (error) {
    console.error("Error searching song:", error);
    throw new Error("Failed to search song data");
  }
}

/**
 * @function `fetchSong``
 * Retrieves detailed metadata for a single specific song using its unique ID.
 * - Hits the '/api/songs/{id}' endpoint.
 * - Returns the raw data array containing the song details.
 */
async function fetchSong(songId) {
  try {
    const fetchSongData = await request(
      `https://jiosaavn-api-wbnc.vercel.app/api/songs/${songId}`,
    );
    const getSongData = await fetchSongData.body.json();

    //console.log(getSongData);
    return getSongData.data;
  } catch (error) {
    console.error("Error fetching song:", error);
    throw new Error("Failed to fetch song data");
  }
}

/**
 * @function fetchSongs
 * Batch processes multiple song IDs simultaneously for better performance.
 * - Uses '.map()' to create an array of pending Promises for every ID.
 * - Utilizes 'Promise.all()' to execute all network requests in parallel rather than one-by-one.
 * - '.filter(Boolean)' ensures that if any song ID fails or returns null, it is removed from the final list.
 */
async function fetchSongs(songIds) {
  try {
    // 1. Create an array of Promises (starts all fetches immediately)
    const songPromises = songIds.map(async id => {
      const result = await fetchSong(id);
      return result && result.length > 0 ? result[0] : null;
  });

    // 2. Wait for all of them to resolve in parallel
    const fetchedSongs = await Promise.all(songPromises);

    return fetchedSongs.filter(Boolean);
  } catch (error) {
    console.error("Error fetching songs:", error);
    throw new Error(`Failed to fetch songs data: ${error.message}`);
  }
}

export { searchaSong, fetchSong, fetchSongs };
