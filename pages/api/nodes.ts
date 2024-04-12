// 引入 Next.js 的请求和响应类型
import type { NextApiRequest, NextApiResponse } from 'next';
// 引入 fetch API 用于发送 HTTP 请求
import fetch from 'node-fetch';

import { PrismaClient } from '@prisma/client'; // 导入 Prisma Client

const prisma = new PrismaClient(); // 创建 Prisma Client 实例

// 我们关注的节点 ID 列表
const nodeIds = ['f019806', 'f01180639', 'f01769576', 'f02146033'];

// 定义 API 响应的类型，它是一个包含多个节点信息的数组
type ApiResponse = NodeBlockInfo[];

// 定义一个接口表示节点的出块信息
interface NodeBlockInfo {
  rewardNodeId: string; // 节点 ID
  blockTime: Date; // 区块时间
  isOurNode: boolean; // 是否是我们关注的节点
  blockHeight: number; // 区块高度
}

// 定义一个异步函数用于获取最近的区块信息，并判断哪些节点有出块活动
async function getRecentBlocksInfo(): Promise<ApiResponse> {
  try {
    // 使用 fetch API 向 Filecoin 的 API 发送请求，获取最近的区块头信息
    const response = await fetch('https://api.node.glif.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "Filecoin.ChainHead",
        "params": []
      })
    });

    // 检查响应状态，如果不是 200 OK，则抛出错误
    if (!response.ok) {
      throw new Error(`HTTP 错误！状态: ${response.status}`);
    }

    // 解析响应数据
    const data = await response.json();
    // 从响应数据中提取最近区块的矿工 ID 和高度
    const recentBlocks = data.result.Blocks;
    const blockInfos: NodeBlockInfo[] = recentBlocks.map((block: any) => ({
      rewardNodeId: block.Miner,
      blockTime: new Date().toISOString(), // 使用当前时间作为区块时间
      isOurNode: nodeIds.includes(block.Miner), // 判断节点是否是我们关注的节点
      blockHeight: block.Height, // 提取区块高度
    }));

    // 打印存储到数据库前的数据
    console.log("Block information before saving to database:", blockInfos);
    
    // 将数据保存到数据库中
    await prisma.filBlock.createMany({
      data: blockInfos,
    });

    // 返回生成的数组
    return blockInfos;
  } catch (error) {
    // 如果在获取信息过程中出现错误，记录错误并返回错误信息
    console.error(`获取最近区块信息失败:`, error);
    throw error; // 抛出错误以便后续处理
  }
}


// 设置定时器，每隔 30 秒执行一次 getRecentBlocksInfo 函数
setInterval(async () => {
  try {
    console.log('定时任务开始执行...');
    await getRecentBlocksInfo();
    console.log('定时任务执行完成。');
  } catch (error) {
    console.error('定时任务执行出错:', error);
  }
}, 30 * 1000);

// Next.js API 路由的主要处理函数
const handler = async (req: NextApiRequest, res: NextApiResponse<ApiResponse>) => {
  try {
    // 调用上面定义的函数，获取最近的出块信息
    const nodeBlockInfos = await getRecentBlocksInfo();
    // 将结果以 JSON 格式响应给客户端
    res.status(200).json(nodeBlockInfos);
  } catch (error) {
    // 如果在获取信息过程中出现错误，记录错误并返回错误信息
    console.error(`获取最近区块信息失败:`, error);
    res.status(500).json([{ rewardNodeId: '', blockTime: new Date(), error: error.message }]);
  }
};

// 导出处理函数，使其可以被 Next.js 路由使用
export default handler;
