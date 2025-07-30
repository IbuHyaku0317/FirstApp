package hyakuta.family.server.repository;

import hyakuta.family.server.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class UserRepository {

    private final DataClassRowMapper<User> mapper = new DataClassRowMapper<>(User.class);

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public UserRepository(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }


    public List<User> getAllUsers(){
        return this.jdbcTemplate.query("SELECT * FROM users", mapper);
    }

}
