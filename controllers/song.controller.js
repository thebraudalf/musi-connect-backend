import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  fetchSong,
  searchaSong,
  fetchSongs,
} from "../utils/seeds/musicSeed/song.seed.js";
import { ChatMessage } from "../models/message.model.js";
import { ListeningHistory } from "../models/listeningHistory.model.js";
import { generateChatCompetion } from "../utils/ai/PromptTemplate.js";

/**
 * @function getSongs
 * Fetches every song according to user profile listening data
 * Used for populating global libraries or debugging.
 */
const getSongs = asyncHandler(async (req, res) => {
  // 1. Get songs with help of genre and language filter
  // 2. Give listening history song list.
  // 3. Give song list based on user liked songs.
  // 4. Give Trending songs list.
  // 5. Give song list based on language and genres.

  // checking user listening history
  const recentHistory = await ListeningHistory.find({
    userId: req.user._id.toHexString(),
  });
  //console.log("recentHistory: ", recentHistory);

  // checking if user is new then give message to search music
  if (recentHistory.length === 0) {
    // returing response
    return res
      .status(200)
      .json(new ApiResponse(200, undefined, "Search Song to play.."));
  }

  function countMap(arr) {
    const map = {};
    for (const item of arr) {
      if (!item) continue;
      map[item] = (map[item] || 0) + 1;
    }
    return map;
  }

  function topKeys(obj, limit = 5) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);
  }

  // Helper function for artist name extraction
  const getArtistNames = (artist) => {
    if (artist?.primary && Array.isArray(artist.primary)) {
      return artist.primary
        .map((primaryArtist) => primaryArtist?.name)
        .filter(Boolean); // Filter out undefined names
    } else if (artist?.primary && artist.primary[0]?.name) {
      return [artist.primary[0].name];
    }

    return [];
  };

  function getTimeSlot(date = new Date()) {
    const hour = date.getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
  }

  /**
   * @function buildHomeContext
   * Crucial utility to build home page song suggestion inventeny.
   * Returns the user profile based listening history data of songs to create give context to model.
   */
  // getting user data to build home page song suggestion
  async function buildHomeContext(userId) {
    const recentHistory = await ListeningHistory.find({ userId: userId })
      .sort({ lastPlayed: -1 })
      .limit(10)
      .lean();
    //console.log("recentHistory: ", recentHistory);

    const likedHistory = await ListeningHistory.find({
      userId: userId,
      isLiked: true,
    }).lean();
    //console.log("likedHistory: ", likedHistory);

    const frequentHistory = await ListeningHistory.find({
      userId: userId,
      playCount: { $gte: 2 },
    }).lean();
    //console.log("frequentHistory: ", frequentHistory);

    const allHistory = await ListeningHistory.find({ userId: userId }).lean();

    const songIds = [...new Set(allHistory.map((x) => x.songId))];
    const songs = await fetchSongs(songIds);

    const songMap = new Map(songs.map((song) => [song.id, song]));

    const recentSongs = recentHistory
      .map((h) => songMap.get(h.songId))
      .filter(Boolean);

    const allSongs = allHistory
      .map((h) => songMap.get(h.songId))
      .filter(Boolean);

    // const recentGenres = recentSongs.map((s) => s.genre).filter(Boolean);
    const recentLanguages = recentSongs.map((s) => s.language).filter(Boolean);
    const recentArtists = recentSongs.map((song) =>
      getArtistNames(song.artists),
    );

    // const allGenres = allSongs.map((s) => s.genre).filter(Boolean);
    const allSongNames = allSongs.map((s) => s.name).filter(Boolean);
    const allLanguages = allSongs.map((s) => s.language).filter(Boolean);
    const allArtists = allSongs.map((song) => getArtistNames(song.artists));
    const availabeSong = allSongs.map((s) => s.name).filter(Boolean);

    return {
      userId,
      recentSongIds: recentHistory.map((x) => x.songId),
      //recentGenres: topKeys(countMap(recentGenres), 3),
      recentLanguages: topKeys(countMap(recentLanguages), 3),
      recentArtists: topKeys(countMap(recentArtists), 5),
      //topGenres: topKeys(countMap(allGenres), 5),
      topSongNames: topKeys(countMap(allSongNames), 5),
      topLanguages: topKeys(countMap(allLanguages), 5),
      topArtists: topKeys(countMap(allArtists), 5),
      likedSongIds: likedHistory.map((x) => x.songId),
      frequentlyPlayedSongIds: frequentHistory.map((x) => x.songId),
      availabeSongCatalog: topKeys(countMap(availabeSong), 5),
      currentTimeSlot: getTimeSlot(),
    };
  }

  const homeContext = await buildHomeContext(req.user._id.toHexString());
  //console.log("homeContext: ", homeContext);

  // get recent songs from db
  const getRecentSongs = await fetchSongs(homeContext?.recentSongIds);
  //console.log("getRecentSong: ", getRecentSongs);

  if (!getRecentSongs || getRecentSongs.length === 0) {
    throw new ApiError(400, "Recent Song not found in db");
  }

  // get liked songs from db
  const getLikedSongs = await fetchSongs(homeContext?.likedSongIds)
  //console.log("getLikedSongs: ", getLikedSongs);

  if (!getLikedSongs || getLikedSongs.length === 0) {
    throw new ApiError(400, "Liked Song not found in db");
  }

  // get frequently played songs from db
  const getFrequentlyPlayedSongs = await fetchSongs(homeContext?.frequentlyPlayedSongIds)
  //console.log("getFrequentlyPlayedSongs: ", getFrequentlyPlayedSongs);

  if (!getFrequentlyPlayedSongs || getFrequentlyPlayedSongs.length === 0) {
    throw new ApiError(400, "Frequently Song not found in db");
  }

  const extractedHomeContext = () => {
    /*const recentGenre =
      homeContext.recentGenres?.join(", ") || "no recent genres";
    //console.log("recentGenre: ", recentGenre);*/
    const recentArtistNames =
      homeContext.recentArtists?.join(", ") || "no recent artists";
    //console.log("recentArtistNames: ", recentArtistNames);
    const recentLanguages =
      homeContext.recentLanguages?.join(", ") || "no recent languages";
    //console.log("recentLanguages: ", recentLanguages);
    /*const topGenres = homeContext.topGenres?.join(", ") || "no to genre";
    //console.log("topGenres", topGenres);*/
    const topLanguages =
      homeContext.topLanguages?.join(", ") || "no top languages";
    //console.log("topLanguages: ", topLanguages);
    const topSongNames = homeContext.topSongNames?.join(", ") || "no top songs";
    //console.log("topSongNames: ", topSongNames);
    const topArtists = homeContext.topArtists?.join(", ") || "no top artists";
    //console.log("topArtists: ", topArtists);

    const recentSongs =
      getRecentSongs?.map((song) => song.name).join(", ") || "no recent song";

    const likedSongs =
      getLikedSongs?.map((song) => song.name).join(", ") || "no liked song";

    const frequentlyPlayedSongs =
      getFrequentlyPlayedSongs?.map((song) => song.name).join(", ") ||
      "no frequently played song";

    const currentTimeSlot = homeContext.currentTimeSlot;

    return {
      recentArtistNames,
      recentLanguages,
      recentSongs,
      topArtists,
      topSongNames,
      topLanguages,
      likedSongs,
      frequentlyPlayedSongs,
      currentTimeSlot,
    };
  };

  // Prompt to first section
  const promptToFirstSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "quick_picks" homepage section.

Goal:
Return the 6 to 10 best songs for the current session using the strongest overall signals.

Use these signals in priority order:
1. Liked songs
2. Frequently played songs
3. Top artist / top genre / top language
4. Recent artist / recent genre / recent language

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "quick_picks"
  - "title": a human-friendly title with current time slot
  - "songs": array of 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- Do not repeat songs inside the section.
- Do not invent song data from a catalog.
- Use only high-confidence real songs and artists that fit the user profile.
- If the context is weak, choose broadly safe songs that match the dominant genre/language/artist.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "quick_picks",
  "title": "Quick picks",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // Prompt to second section
  const promptToSecondSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "because_you_liked" homepage section.

Goal:
Recommend songs strongly related to the user’s dominant liked artist or liked song pattern.

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "because_you_liked"
  - "title": must mention the strongest relevant artist if available
  - "songs": 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- Focus on songs by the same artist, close collaborators, similar style, or very adjacent tracks.
- Prefer the strongest liked artist first.
- If no liked artist is clear, use the strongest liked song pattern.
- Do not invent catalog-based data.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "because_you_liked",
  "title": "...",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // Prompt to third section
  const promptToThirdSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "favorite_genre" homepage section.

Goal:
Recommend songs based on the user’s top genre.

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "favorite_genre"
  - "title": must mention the top genre if clear
  - "songs": 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- Prefer songs strongly associated with the top genre.
- If the genre is unclear, use the most frequent genre from recent and repeated history.
- Avoid songs that clearly clash with the genre.
- Do not invent songs from a catalog.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "favorite_genre",
  "title": "...",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // Prompt to fourth section
  const promptToFourthSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "language_row" homepage section.

Goal:
Recommend songs in the user’s dominant language.

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "language_row"
  - "title": must mention the language if clear
  - "songs": 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- Prefer songs in the top language first.
- If the top language is missing, infer from recent songs and liked songs.
- Do not include songs in unrelated languages unless the context is weak and no better option exists.
- Do not invent songs from a catalog.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "language_row",
  "title": "...",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // Prompt to fifth section
  const promptToFifthSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "like_again" homepage section.

Goal:
Recommend songs the user is likely to replay or enjoy again.

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "like_again"
  - "title": a natural replay-oriented title
  - "songs": 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- Prefer songs that were:
  - played many times,
  - liked before,
  - or recently replayed.
- Rank the most replay-worthy songs first.
- Avoid random novelty.
- Do not invent songs from a catalog.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "like_again",
  "title": "...",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // Prompt to sixth section
  const promptToSixthSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "long_listens" homepage section.

Goal:
Recommend songs that work well for extended listening sessions.

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "long_listens"
  - "title": a natural long-session title
  - "songs": 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- Prefer songs that are:
  - smooth,
  - replay-friendly,
  - emotionally consistent,
  - and suitable for long sessions.
- Prioritize familiarity and flow over novelty.
- Do not invent songs from a catalog.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "long_listens",
  "title": "...",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // Prompt to seventh section
  const promptToSeventhSection = async () => {
    const getExtractedHomeContext = extractedHomeContext();

    const promptToGiveContext = () =>
      new Object({
        role: "system",
        content: `You are generating ONLY the "explore_more" homepage section.

Goal:
Recommend songs that are slightly novel but still close to the user’s taste.

Rules:
- Return ONLY valid JSON.
- Return one object with:
  - "sectionId": "explore_more"
  - "title": a natural discovery-oriented title
  - "songs": 6 to 10 song objects
- Each song object must contain exactly:
  - "songName"
  - "artistName"
  - "genre"
- This section should be the most exploratory, but still safe and relevant.
- Prefer adjacent artists, adjacent genres, related languages, or similar energy.
- Avoid random or unrelated songs.
- Do not invent songs from a catalog.
- Do not explain anything.

INPUT CONTEXT:
- Current Time Slot: ${getExtractedHomeContext.currentTimeSlot}
- Recent Songs: ${getExtractedHomeContext.recentSongs}
- Recent Genre: Predict from recent songs
- Top Song Names: ${getExtractedHomeContext.topSongNames}
- Top Genre: Predict from Top Song Names
- Recent Artist: ${getExtractedHomeContext.recentArtistNames}
- Top Artist: ${getExtractedHomeContext.topArtists}
- Recent Language: ${getExtractedHomeContext.recentLanguages}
- Top Language: ${getExtractedHomeContext.topLanguages}
- Liked Songs: ${getExtractedHomeContext.likedSongs}
- Repeated Songs: ${getExtractedHomeContext.frequentlyPlayedSongs}

# Example Format:
{
  "sectionId": "explore_more",
  "title": "...",
  "songs": [
    { "songName": "Song 1", "artistName": "Artist 1", "genre": "..." },
    { "songName": "Song 2", "artistName": "Artist 2", "genre": "..." }
  ]
}

FINAL CHECK BEFORE RESPONDING:
- Each songs array has 6 to 10 items
- Every song has only songName and artistName
- No markdown
- No extra text
- Valid JSON only
  `,
      });
    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    //console.log("generateSongSuggestion: ", generateSongSuggestion);

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (
        typeof recommendedSongs !== "object" ||
        recommendedSongs === null ||
        Array.isArray(recommendedSongs)
      ) {
        throw new Error("Expected an Object");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    // checking if recommended songs isn't empty
    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongs = [];
    try {
      for (const { songName, genre } of recommendedSongs.songs) {
        const apiResults = await searchaSong(songName, 1);
        if (apiResults && apiResults.length > 0) {
          const song = apiResults[0];
          suggestedSongs.push(song);
        }
      }
    } catch (err) {
      console.error(`Skipping song ${songName} due to sync error`);
    }

    //console.log("Suggested Songs Details from API:", suggestedSongs);
    return new Object({
      sectionId: recommendedSongs.sectionId,
      title: recommendedSongs.title,
      songs: suggestedSongs,
    });
  };

  // passing all content to api response
  const firstSectionContent = await promptToFirstSection();
  const secondSectionContent = await promptToSecondSection();
  const thirdSectionContent = await promptToThirdSection();
  const fourthSectionContent = await promptToFourthSection();
  const fifthSectionContent = await promptToFifthSection();
  const sixthSectionContent = await promptToSixthSection();
  const seventhSectionContent = await promptToSeventhSection();

  // returing response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        [
          firstSectionContent,
          secondSectionContent,
          thirdSectionContent,
          fourthSectionContent,
          fifthSectionContent,
          sixthSectionContent,
          seventhSectionContent,
        ],
        "Successfully found songs to play",
      ),
    );
});

/**
 * @function getSearchSongResults
 * Bridge between external API search results
 */
const getSearchSongResults = asyncHandler(async (req, res) => {
  const searchSong = req.songResponse;

  if (!searchSong) {
    throw new ApiError(400, "Unable to get song response");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, searchSong, "Song searched Successfully."));
});

/**
 * @function playSong
 * The primary execution point when a user clicks "Play".
 * 1. Validates the songId.
 * 2. Increments 'playCount' and updates 'lastPlayed' timestamp in the ListeningHistory collection.
 * 3. Ensures history is tracked even if the song was just discovered.
 */
const playSong = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  //console.log(songId);

  if (!songId) {
    throw new ApiError(400, "songId is required.");
  }

  const fetchASong = await fetchSong(songId);

  if (fetchASong.length === 0) {
    throw new ApiError(400, "Unable to get songs response to play");
  }

  // creating and updating listeningHistory
  const songHistory = await ListeningHistory.findOneAndUpdate(
    {
      userId: req.user._id,
      songId: songId,
    },
    {
      $inc: { playCount: 1 }, // Increment total plays
      $set: {
        lastPlayed: new Date(),
        eventType: "play",
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        songHistory,
        "Successfully found history of current song",
      ),
    );
});

/**
 * @function toggleLikeSong
 * Handles the "Heart" button logic.
 * It first checks if a record exists to determine if it should "Like" or "Unlike" (flip the boolean).
 * Updates the 'isLiked' status in the ListeningHistory model.
 */
const toggleLikeSong = asyncHandler(async (req, res) => {
  const { songId } = req.params;
  //console.log("songId: ", songId);

  const userId = req.user._id;

  if (!songId) {
    throw new ApiError(400, "Song ID is required");
  }

  // finding the current status first to "toggle" it
  const existingRecord = await ListeningHistory.findOne({ userId, songId });

  // If it exists, flip the current status; if not, default to true
  const newLikeStatus = existingRecord ? !existingRecord.isLiked : true;

  // updating the record
  const updatedHistory = await ListeningHistory.findOneAndUpdate(
    { userId, songId },
    {
      $set: { isLiked: newLikeStatus },
      $setOnInsert: { playCount: 0 },
    },
    { upsert: true, new: true },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isLiked: updatedHistory.isLiked },
        newLikeStatus
          ? "Song added to liked songs"
          : "Song removed from liked songs",
      ),
    );
});

/**
 * @function getSuggestedSong (Mood-Based)
 * 1. Gathers 'Cold Start' data (History, Likes, High-Play counts) from ListeningHistory.
 * 2. Builds a 'System Prompt' describing the user's taste and current mood.
 * 3. Calls the AI (Groq) to generate a JSON list of 20 songs with a "reason" field.
 * 5. Passes 'suggestedSongsIds' to the next middleware (sendMessage).
 */
const getSuggestedSong = asyncHandler(async (req, res, next) => {
  // Step 1: Extract the user message from the request body
  // Step 2: Get list of highest played songs, most liked songs of an particular genre and artists
  // Step 3: Get the current time of reciever message
  // Step 4: Based on the current mood of user predict atleast 20 songs through the list of songs and current time call the generateChatCompetion func and pass the result as a message to the function
  // Step 5: Call the generateChatCompetion func with the user message
  // Step 6: Extract song data to song collection then pass only songid and ai reason as a chat response

  try {
    // extracting the user message from the request body
    const { receiverMessage } = req.body;
    //console.log("receiverMessage", receiverMessage);

    // checking if the receiverMessage and content is present in the request body
    if (!receiverMessage) {
      throw new ApiError(400, "Receiver message are required");
    }

    // getting list of higher play count songs and most liked songs
    const alreadyPlayedSongs = await ListeningHistory.find({
      userId: req.user._id.toHexString(),
    });
    //console.log("alreadyPlayedSongs: ", alreadyPlayedSongs);

    let listeningHistorySongs = [];
    let higherPlayCountSongs = [];
    let likedSongs = [];
    if (alreadyPlayedSongs.length > 0) {
      listeningHistorySongs = await fetchSongs(
        alreadyPlayedSongs.map((history) => history.songId),
      );

      const highPlayCountIds = alreadyPlayedSongs
        .filter(
          (history) => history.eventType === "play" && history.playCount >= 5, // Fixed field name
        )
        .map((history) => history.songId);
      //console.log("Higher play count song Ids: ", highPlayCountIds);

      if (highPlayCountIds.length > 0) {
        higherPlayCountSongs = await fetchSongs(highPlayCountIds);
      }

      const likedSongsIds = alreadyPlayedSongs
        .filter((history) => history.isLiked === true)
        .map((history) => history.songId);
      //console.log("Liked Songs Ids: ", likedSongsIds);

      if (likedSongsIds.length > 0) {
        likedSongs = await fetchSongs(likedSongsIds);
      }
    }
    //console.log("Higher play count songs: ", higherPlayCountSongs);
    //console.log("Liked songs: ", likedSongs);

    // Helper function for artist name extraction
    const getArtistNames = (artist) => {
      if (artist?.primary && Array.isArray(artist.primary)) {
        return artist.primary
          .map((primaryArtist) => primaryArtist?.name)
          .filter(Boolean); // Filter out undefined names
      } else if (artist?.primary && artist.primary[0]?.name) {
        return [artist.primary[0].name];
      }

      return [];
    };

    //console.log("getArtistNames: ", getArtistNames);

    // function to give context to model via prompting
    const promptToGiveContext = () => {
      const historySongNames =
        listeningHistorySongs?.map((song) => song.name).join(", ") ||
        "no recent history";
      //console.log("historySongNames: ", historySongNames);
      const historyArtistNames =
        listeningHistorySongs
          ?.map((song) => getArtistNames(song.artists).join(" & "))
          .join(", ") || "no recent history";
      //console.log("historyArtistNames: ", historyArtistNames);

      const higherPlayCountSongNames =
        higherPlayCountSongs?.map((song) => song.name).join(", ") ||
        "no recent history";
      const higherPlayCountSongArtistNames =
        higherPlayCountSongs
          ?.map((song) => getArtistNames(song.artists).join(" & "))
          .join(", ") || "no recent history";

      const likedSongNames =
        likedSongs?.map((song) => song.name).join(", ") || "no recent history";
      const likedSongArtistNames =
        likedSongs
          ?.map((song) => getArtistNames(song.artists).join(" & "))
          .join(", ") || "no recent history";

      // getting the current time of reciever message
      const currentTime = new Date();
      //console.log(currentTime);

      return new Object({
        role: "system",
        content: `# Role: Mood Song Predictor
# Goal:
You are a music recommendation agent. Based on the user's current mood: "${receiverMessage}" and current time of day: "${currentTime}", predict at least 10 songs that best fit the listener’s emotional state and session context.

Use the following signals to improve recommendations:
- Recent listening history: ${historySongNames} by ${historyArtistNames}
- Most played songs: ${higherPlayCountSongNames} by ${higherPlayCountSongArtistNames}
- Most liked songs: ${likedSongNames} by ${likedSongArtistNames}

# Recommendation Strategy:
1. First, identify the likely emotional state from the mood text and time of day.
2. Choose songs that create a smooth emotional arc across the list:
   - Start with familiar, safe songs similar to the user’s taste.
   - Include emotionally adjacent discoveries that are close in vibe but not identical.
   - Balance the sequence so it can gradually heal, energize, or stabilize the user.
3. Your first priority should be give what user wants then you suggest some songs.
4. Take help if you want to prefer songs that match the user’s taste patterns from history, play count, and liked songs.
5. Include the song genre as an input signal and use it to improve mood matching especially when user history is limited or unavailable.
7. Do not repeat songs or artists unless strongly justified.
8. Ensure diversity in tempo, energy, and mood progression while staying emotionally coherent.
9. Return songs in ranked order, with the best fit first.

# Output Rules:
- Return EXACTLY one valid JSON array.
- Do not include markdown, code fences, explanations, notes, or extra text.
- The first item must be a JSON object with a single field:
  { "reason": "..." }
- Then include at least 20 song objects.
- Each song object must have exactly these fields:
  { "title": "...", "artist": "...", "genre": "..." }
- Return genre field value in lowercase.
- Keep song titles and artist names clean and accurate.
- Return only JSON.

# Example format:
[
  { "reason": "Hey, my analysis say that these are the perfect combination of songs that matches your mood(Give reason why you suggested these songs to user in user friendly way)" },
  { "title": "Song 1", "artist": "Artist 1", "genre": "..." },
  { "title": "Song 2", "artist": "Artist 2", "genre": "..." }
]`,
      });
    };

    const generateSongSuggestion =
      await generateChatCompetion(promptToGiveContext);

    if (!generateSongSuggestion) {
      throw new ApiError(404, "Failed to generate song suggestion from AI.");
    }

    let recommendedSongs;
    try {
      recommendedSongs = JSON.parse(generateSongSuggestion);
      if (!Array.isArray(recommendedSongs)) {
        throw new Error("Expected an array");
      }
    } catch (err) {
      console.error("Failed to parse AI response:", err);
      throw new ApiError(500, "AI did not return valid song suggestions");
    }

    if (!recommendedSongs) {
      throw new ApiError(404, "Could not parse AI recommendation");
    }

    //console.log("recommendedSongs: ", recommendedSongs);

    const suggestedSongsIds = [];

    // Iterate through the recommended titles and call the API
    for (const { title, genre } of recommendedSongs) {
      // skipping entries that don't have a title (like the 'reason' object)
      if (!title) {
        //console.log("Skipping metadata/reasoning entry.");
        continue;
      }

      try {
        const apiResults = await searchaSong(title, 1);

        if (apiResults && apiResults.length > 0) {
          const songId = apiResults[0].id;
          suggestedSongsIds.push(songId);
        }
      } catch (err) {
        console.error(`Skipping song ${title} due to sync error`);
      }
    }

    //console.log("Suggested Songs Details from API:", suggestedSongsIds);

    req.chatResponse = recommendedSongs[0].reason;
    req.suggestedSongsIds = suggestedSongsIds;
    next();
  } catch (error) {
    //console.error(error);
    res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", error.message));
  }
});

/**
 * @function playSuggestedSong
 * The primary execution point when a user clicks "Playlist".
 * 1. Validates the messageId.
 * 2. Uses 'findById' to get the `recommendedSongs`.
 * 4. Then returns that songs.
 */
const playSuggestedSong = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  //console.log(messageId);

  if (!messageId) {
    throw new ApiError(400, "messageId is required.");
  }

  // retriving relevent document
  const songIds = await ChatMessage.findById({ _id: messageId }).select(
    "recommendedSongs",
  );
  //console.log("songIds: ", songIds);
  if (!songIds) {
    throw new ApiError(400, "Unable to get songs Ids");
  }

  const suggestedSong = await fetchSongs(
    songIds.recommendedSongs.map((songId) => songId),
  );
  if (suggestedSong.length === 0) {
    throw new ApiError(400, "Unable to get songs response to play");
  }
  //console.log("playSong: ", suggestedSong);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        suggestedSong,
        "Successfully found searched songs to play",
      ),
    );
});

/**
 * @function playNextRecommendedSong (Context-Based)
 * Similar to getSuggestedSong, but prioritizes the 'currentSong' metadata.
 * It instructs the AI to create a "smooth transition" from the currently playing track.
 * Returns exactly 5 songs to keep the "Up Next" queue concise.
 */
const playNextRecommendedSong = asyncHandler(async (req, res, next) => {
  // Step 1: Extract the user message from the request body
  // Step 2: Get list of highest played songs, most liked songs of an particular genre and artists
  // Step 3: Get the current time of reciever message
  // Step 4: Based on the current mood of user predict atleast 10 songs through the list of songs and current time call the generateChatCompetion func and pass the result as a message to the function
  // Step 5: Call the generateChatCompetion func with the user message
  // Step 6: Extract song data to song collection then pass only songid chat response

  // extracting the user message from the request body
  const { receiverMessage } = req.body;
  //console.log("receiverMessage", receiverMessage);

  // checking if the receiverMessage and content is present in the request body
  if (!receiverMessage) {
    throw new ApiError(400, "Query is required");
  }

  const { songId } = req.params;

  if (!songId) {
    throw new ApiError(400, "Song Id is required.");
  }

  const currentSong = await fetchSong(songId);
  //console.log("currentSong: ", currentSong);
  if (currentSong.length < 0) {
    throw new ApiError(404, "Current song not found.");
  }

  const alreadyPlayedSongs = await ListeningHistory.find({
    userId: req.user._id.toHexString(),
  });

  let listeningHistorySongs = [];
  let higherPlayCountSongs = [];
  let likedSongs = [];
  if (alreadyPlayedSongs.length > 0) {
    listeningHistorySongs = await fetchSongs(
      alreadyPlayedSongs.map((history) => history.songId),
    );

    const highPlayCountIds = alreadyPlayedSongs
      .filter(
        (history) => history.eventType === "play" && history.playCount >= 5, // Fixed field name
      )
      .map((history) => history.songId);
    //console.log("Higher play count song Ids: ", highPlayCountIds);

    if (highPlayCountIds.length > 0) {
      higherPlayCountSongs = await fetchSongs(highPlayCountIds);
    }

    const likedSongsIds = alreadyPlayedSongs
      .filter((history) => history.isLiked === true)
      .map((history) => history.songId);
    //console.log("Liked Songs Ids: ", likedSongsIds);

    if (likedSongsIds.length > 0) {
      likedSongs = await fetchSongs(likedSongsIds);
    }
  }
  //console.log("Higher play count songs: ", higherPlayCountSongs);
  //console.log("Liked songs: ", likedSongs);

  // Helper function for artist name extraction
  const getArtistNames = (artist) => {
    if (artist?.primary && Array.isArray(artist.primary)) {
      return artist.primary
        .map((primaryArtist) => primaryArtist?.name)
        .filter(Boolean); // Filter out undefined names
    } else if (artist?.primary && artist.primary[0]?.name) {
      return [artist.primary[0].name];
    }

    return [];
  };

  const promptToGiveContext = () => {
    const currentArtistNames =
      getArtistNames(currentSong[0].artists).join(" & ") || "unknown";
    //console.log("currentArtistNames: ", currentArtistNames)

    const historySongNames =
      listeningHistorySongs?.map((song) => song.name).join(", ") ||
      "no recent history";
    const historyArtistNames =
      listeningHistorySongs
        ?.map((song) => getArtistNames(song.artists).join(" & "))
        .join(", ") || "no recent history";

    const higherPlayCountSongNames =
      higherPlayCountSongs?.map((song) => song.name).join(", ") ||
      "no recent history";
    const higherPlayCountSongArtistNames =
      higherPlayCountSongs
        ?.map((song) => getArtistNames(song.artists).join(" & "))
        .join(", ") || "no recent history";

    const likedSongNames =
      likedSongs?.map((song) => song.name).join(", ") || "no recent history";
    const likedSongArtistNames =
      likedSongs
        ?.map((song) => getArtistNames(song.artists).join(" & "))
        .join(", ") || "no recent history";

    // getting the current time of reciever message
    const currentTime = new Date();
    //console.log(currentTime);

    return new Object({
      role: "system",
      content: `# Role: Next Song Recommender
# Goal:
You are a music recommendation agent. Based on the user's query: "${receiverMessage}", the currently playing song: "${currentSong[0].name}" by "${currentArtistNames}", and the current time of day: "${currentTime}", predict at least 5 songs that best fit the listener’s emotional state, taste, and session context.

Use the following signals to improve recommendations:
- Recent listening history: ${historySongNames} by ${historyArtistNames}
- Most played songs: ${higherPlayCountSongNames} by ${higherPlayCountSongArtistNames}
- Most liked songs: ${likedSongNames} by ${likedSongArtistNames}

# Recommendation Strategy:
1. First, understand the user's intent from the query. If the query asks for a specific vibe, language, genre, activity, or emotion, prioritize that request above everything else.
2. Then analyze the currently playing song and use it as the strongest context for the next-song flow.
3. Use the time of day to shape the energy:
   - Morning: light, fresh, uplifting, smooth start.
   - Afternoon: steady, focused, balanced.
   - Evening: relaxed, warm, emotional, reflective.
   - Late night: calm, intimate, soothing, low-intensity.
4. Create a smooth listening progression:
   - Start with the safest and most familiar match.
   - Add emotionally adjacent discoveries that are close in vibe, tempo, language, genre, or instrumentation.
   - Balance familiarity and novelty.
   - Keep the sequence coherent across multiple songs, not just the first one.
5. Use the user's history, liked songs, and most-played songs to infer:
   - Preferred genres and languages.
   - Typical energy level.
   - Repeated artists or styles.
   - Discovery tolerance.
6. Avoid:
   - Random or unrelated songs.
   - Sudden extreme mood shifts unless the query explicitly asks for that.
   - Repeating the same artist too often unless the user clearly favors them.
   - Songs that clash with the current emotional state or session flow.
7. Rank the songs by best fit first.
8. If the user’s query is ambiguous, infer the most likely intent from context and current song.
9. If user history is empty or insufficient, do not penalize the recommendation quality. Use the current song, query intent, time of day, and globally safe matches to generate the list. Prefer broadly compatible songs, familiar chart-level tracks, and emotionally adjacent options.

# Output Rules:
- Return EXACTLY one valid JSON array.
- Do not include markdown, code fences, comments, explanations, or extra text.
- The JSON array must contain at least 5 song objects.
- Each song object must have exactly these fields:
  { "title": "...", "artist": "...", "genre": "..." }
- Return genre field value in lowercase.
- Use clean, accurate song and artist names.
- Do not include duplicates.
- Return only JSON.

# Example format:
[
  { "title": "Song 1", "artist": "Artist 1", "genre": "..." },
  { "title": "Song 2", "artist": "Artist 2", "genre": "..." }
]`,
    });
  };

  const generateSongSuggestion =
    await generateChatCompetion(promptToGiveContext);

  if (!generateSongSuggestion) {
    throw new ApiError(404, "Failed to generate song suggestion from AI.");
  }

  let recommendedSongs;
  try {
    recommendedSongs = JSON.parse(generateSongSuggestion);
    if (!Array.isArray(recommendedSongs)) {
      throw new Error("Expected an array");
    }
  } catch (err) {
    console.error("Failed to parse AI response:", err);
    throw new ApiError(500, "AI did not return valid song suggestions");
  }

  if (!recommendedSongs) {
    throw new ApiError(404, "Could not parse AI recommendation");
  }

  //console.log("recommendedSongs: ", recommendedSongs);

  const suggestedSongs = [];

  // Iterate through the recommended titles and call the API
  for (const { title, genre } of recommendedSongs) {
    // skipping entries that don't have a title (like the 'reason' object)
    if (!title) {
      //console.log("Skipping metadata/reasoning entry.");
      continue;
    }

    try {
      const apiResults = await searchaSong(title, 1);

      if (apiResults && apiResults.length > 0) {
        const song = apiResults[0];
        suggestedSongs.push(song);
      }
    } catch (err) {
      console.error(`Skipping song ${title} due to sync error`);
    }
  }

  //console.log("Suggested Songs Details from API:", suggestedSongs);

  req.suggestedSongs = suggestedSongs;
  next();
});

export {
  getSongs,
  getSearchSongResults,
  playSong,
  toggleLikeSong,
  getSuggestedSong,
  playSuggestedSong,
  playNextRecommendedSong,
};
