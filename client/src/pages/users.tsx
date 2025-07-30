import useSWR from "swr";
import type { User } from "../type/user";
import { fetcher } from "../infra/fetcher";

function Users() {
  const {
    data: users,
    isLoading,
    error,
  } = useSWR<User[]>("/api/users", fetcher);
  console.log(users);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>エラーが発生しました</div>;
  if (!users) return <div>ユーザーが見つかりません</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>名前</th>
          {/* 必要に応じて他のカラムも追加 */}
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.name}</td>
            {/* 他のプロパティも表示可能 */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Users;
