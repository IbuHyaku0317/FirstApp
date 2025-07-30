package hyakuta.family.server.controller;

import hyakuta.family.server.model.User;
import hyakuta.family.server.repository.UserRepository;
import hyakuta.family.server.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserRestController {

    private final UserService userService;

    @Autowired
    public UserRestController(UserService userService){
        this.userService = userService;
    }
    @GetMapping
    public List<UserResponse> getAllUsers(){
        return userService.allUsers().stream().map(UserResponse::fromDomain).toList();
    }
}
