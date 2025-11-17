// composables/ranking.ts (最終版)

/**
 * GASのURLを取得するヘルパー
 */
function getGasUrl() {
  const config = useRuntimeConfig();
  const gasUrl = config.public.gasUrl;
  if (!gasUrl) {
    console.error('GAS URL is not defined in .env or nuxt.config.ts');
    return null;
  }
  return gasUrl;
}

/**
 * スプレッドシートからランキングを取得する (GASの doGet?action=get)
 * @param level 取得対象のレベル
 */
export const getRankingFromSheet = async (level: number) => {
  const gasUrl = getGasUrl();
  if (!gasUrl) return [];
  
  try {
    const rankings = await $fetch<any[]>(gasUrl, {
      method: 'GET',
      params: {
        action: 'get', // ★ 読み込みのアクションを指定
        level: level
      }
    });
    return rankings;
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return [];
  }
}

/**
 * スプレッドシートにスコアを登録する (GASの doGet?action=set)
 * ★ POST から GET に変更
 * @param level 登録するレベル
 * @param score 登録するスコア
 */
export const setRankingToSheet = async (level: number, score: number) => {
  const gasUrl = getGasUrl();
  if (!gasUrl) return;

  try {
    await $fetch(gasUrl, {
      method: 'GET', // ★ POST から GET に変更
      params: {
        action: 'set', // ★ 書き込みのアクションを指定
        level: level,
        score: score
      }
    });
  } catch (error) {
    console.error('Error setting ranking:', error);
  }
}