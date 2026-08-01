import { db } from './db'

export async function processNewsApprovalEarning(newsId: string, isVideo: boolean) {
  try {
    const news = await db.news.findUnique({ where: { id: newsId } })
    if (!news || !news.reporterId) return

    // Ensure we don't reward multiple times for the same news
    const existingTransaction = await db.walletTransaction.findFirst({
      where: { reporterId: news.reporterId, referenceId: newsId }
    })
    if (existingTransaction) return

    const rewardSettingKey = isVideo ? 'REWARD_VIDEO' : 'REWARD_ARTICLE'
    const setting = await db.setting.findUnique({ where: { key: rewardSettingKey } })
    // Default values if not set: Video=50, Article=2
    const rewardAmount = setting ? parseInt(setting.value, 10) : (isVideo ? 50 : 2)

    if (rewardAmount <= 0) return

    // Run transaction
    await db.$transaction([
      db.walletTransaction.create({
        data: {
          reporterId: news.reporterId,
          amount: rewardAmount,
          type: 'CREDIT',
          description: `Reward for approved ${isVideo ? 'video' : 'article'} news: ${news.title}`,
          referenceId: newsId,
        }
      }),
      db.reporter.update({
        where: { id: news.reporterId },
        data: {
          coinsBalance: { increment: rewardAmount }
        }
      })
    ])

    console.log(`Credited ${rewardAmount} coins to reporter ${news.reporterId} for news ${newsId}`)
  } catch (error) {
    console.error('Error processing earning for news approval:', error)
  }
}

export async function processVideoApprovalEarning(videoId: string) {
  try {
    // Currently, standard videos don't have reporterId in schema, but if they are tied to reporters later, add logic here.
    // For now, if videos are uploaded by admins, no reward. If they are linked to reporters, add here.
    const video = await db.video.findUnique({ where: { id: videoId } })
    if (!video) return
    // Schema Video model doesn't have reporterId, only News does right now.
  } catch (error) {
    console.error('Error processing earning for video approval:', error)
  }
}
