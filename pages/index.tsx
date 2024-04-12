// 引入 React 的 useEffect 钩子和 swr 库用于数据获取
import { useEffect } from 'react';
import useSWR from 'swr';
// 引入 Next.js 的页面类型定义
import type { NextPage } from 'next';

// 定义用于获取数据的函数，使用 fetch API 从 '/api/nodes' 端点获取数据
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 定义一个函数，用于将当前时间格式化为本地时间字符串
const formatTimestamp = () => {
  const now = new Date();
  return now.toLocaleString();
};

// 定义节点信息接口，包含节点 ID 和是否出块的布尔值
interface NodeBlockInfo {
  rewardNodeId: string; // 节点 ID
  blockTime: Date; // 区块时间
}

// 定义主组件
const Home: NextPage = () => {
  // 使用 SWR 钩子获取节点数据，传递 fetcher 函数作为参数
  const { data, error, mutate } = useSWR<any>('/api/nodes', fetcher);

  // 使用 useEffect 钩子设置定时器，每30秒通过 mutate 函数重新获取数据
  useEffect(() => {
    const interval = setInterval(() => mutate(), 30000);
    return () => clearInterval(interval); // 组件卸载时清除定时器
  }, [mutate]);

  // 处理错误状态
  if (error) return <div>Failed to load</div>;
  // 处理数据正在加载状态
  if (!data) return <div>Loading...</div>;

  // 筛选出已经出块的节点
  const recentMinerIds: any = data.nodeBlockInfos.filter(node => node.hasBlock);
  console.log(recentMinerIds);
  // 渲染页面内容
  return (
    <div>
      <h1>Filecoin Node Block Info</h1>
      <div>
        <h2>当前时间段出块节点：</h2>
        {data.recentMinerIds.length > 0 ? (
          data.recentMinerIds.map((nodeId, index) => (
              <p key={index}>{`${formatTimestamp()} - 节点 ${nodeId} 已出块`}</p>
            ))
        ) : (
          <p>当前没有节点出块</p>
        )}
      </div>
      <div>
        <h2>所有节点出块情况：</h2>
        {/* 渲染所有节点的出块情况 */}
        {data.nodeBlockInfos.map(({ nodeId, hasBlock }, index) => (
          <div key={index}>
            <p>{`${formatTimestamp()} - 节点 ${nodeId}: ${hasBlock ? '已出块' : '未出块'}`}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// 导出组件，使其可以在其他地方被使用
export default Home;
